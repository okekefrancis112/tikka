import { Module } from "@nestjs/common";
import { CursorManagerService } from "./cursor-manager.service";

import { EventParserService } from "./event-parser.service";

@Module({
  providers: [CursorManagerService, EventParserService],
  exports: [CursorManagerService, EventParserService],
})
export class IngestorModule {}
