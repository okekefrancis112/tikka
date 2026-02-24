import { supabase, RAFFLE_METADATA_TABLE } from "../config/supabase";
import { api } from "./apiClient";
import { API_CONFIG } from "../config/api";
import type { RaffleMetadata, SupabaseRaffleRecord } from "../types/types";

export class MetadataService {
  /**
   * Upload raffle metadata to Supabase and return the record ID
   */
  static async uploadRaffleMetadata(metadata: RaffleMetadata): Promise<string> {
    try {
      console.log("📤 MetadataService: Uploading metadata:", metadata);
      const { data, error } = await supabase
        .from(RAFFLE_METADATA_TABLE)
        .insert([
          {
            metadata,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select("id")
        .single();

      if (error) {
        console.error("❌ MetadataService: Upload error:", error);
        throw new Error(`Failed to upload metadata: ${error.message}`);
      }

      console.log("✅ MetadataService: Upload successful, ID:", data.id);
      return data.id;
    } catch (error) {
      console.error("Error uploading raffle metadata:", error);
      throw error;
    }
  }

  /**
   * Fetch raffle metadata by record ID
   */
  static async getRaffleMetadata(
    recordId: string,
  ): Promise<RaffleMetadata | null> {
    try {
      const { data, error } = await supabase
        .from(RAFFLE_METADATA_TABLE)
        .select("metadata")
        .eq("id", recordId)
        .single();

      if (error) {
        console.error("Error fetching metadata:", error);
        return null;
      }

      return data.metadata;
    } catch (error) {
      console.error("Error fetching raffle metadata:", error);
      return null;
    }
  }

  /**
   * Fetch raffle metadata by contract raffle ID
   */
  static async getRaffleMetadataByContractId(
    raffleId: number,
  ): Promise<RaffleMetadata | null> {
    try {
      const { data, error } = await supabase
        .from(RAFFLE_METADATA_TABLE)
        .select("metadata")
        .eq("raffle_id", raffleId)
        .single();

      if (error) {
        console.error("Error fetching metadata by contract ID:", error);
        return null;
      }

      return data.metadata;
    } catch (error) {
      console.error("Error fetching raffle metadata by contract ID:", error);
      return null;
    }
  }

  /**
   * Update raffle metadata
   */
  static async updateRaffleMetadata(
    recordId: string,
    metadata: Partial<RaffleMetadata>,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(RAFFLE_METADATA_TABLE)
        .update({
          metadata: {
            ...metadata,
            updatedAt: Date.now(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", recordId);

      if (error) {
        throw new Error(`Failed to update metadata: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error updating raffle metadata:", error);
      return false;
    }
  }

  /**
   * Link a Supabase record to a contract raffle ID
   */
  static async linkToContract(
    recordId: string,
    raffleId: number,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(RAFFLE_METADATA_TABLE)
        .update({
          raffle_id: raffleId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recordId);

      if (error) {
        throw new Error(`Failed to link to contract: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error linking to contract:", error);
      return false;
    }
  }

  /**
   * Get all raffles by creator
   */
  static async getRafflesByCreator(
    creatorAddress: string,
  ): Promise<SupabaseRaffleRecord[]> {
    try {
      const { data, error } = await supabase
        .from(RAFFLE_METADATA_TABLE)
        .select("*")
        .eq("metadata->createdBy", creatorAddress)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch raffles by creator: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching raffles by creator:", error);
      return [];
    }
  }

  /**
   * Upload raffle metadata and image to the backend backend
   * returns metadataCid
   */
  static async uploadMetadataWithImage(
    metadata: Partial<RaffleMetadata>,
    imageFile: File,
  ): Promise<string> {
    try {
      console.log(
        "📤 MetadataService: Uploading metadata and image to backend",
      );

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("image", imageFile);

      // Add metadata fields
      // The backend expect metadata as a JSON string or individual fields depending on implementation
      // Based on ARCHITECTURE, it's POST /raffles/metadata
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined) {
          if (typeof value === "object") {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const response = await api.post<{ metadataCid: string }>(
        API_CONFIG.endpoints.raffles.metadata,
        formData,
        { requiresAuth: true, headers: {} }, // Content-Type is handled by browser for FormData
      );

      // If api.post doesn't support FormData directly because of JSON.stringify in apiClient.ts,
      // we might need a custom fetch here or adjust apiClient.
      // Let's check apiClient.ts again.

      console.log(
        "✅ MetadataService: Backend upload successful, CID:",
        response.metadataCid,
      );
      return response.metadataCid;
    } catch (error) {
      console.error("Error uploading to backend:", error);
      throw error;
    }
  }
}
