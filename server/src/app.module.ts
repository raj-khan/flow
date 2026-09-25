import { Module, type DynamicModule } from '@nestjs/common'
import type pg from 'pg'

import { CONFIG, type Config } from './config.js'
import { POOL } from './database.js'
import { DiagramsController } from './diagrams/diagrams.controller.js'
import { DiagramsRepository } from './diagrams/diagrams.repository.js'
import { DiagramsService } from './diagrams/diagrams.service.js'
import { McpController } from './mcp/mcp.controller.js'
import { McpService } from './mcp/mcp.service.js'

@Module({})
export class AppModule {
  /** The pool is opened by the caller, so tests and `main` each own theirs. */
  static with(config: Config, pool: pg.Pool): DynamicModule {
    return {
      module: AppModule,
      controllers: [DiagramsController, McpController],
      providers: [
        { provide: CONFIG, useValue: config },
        { provide: POOL, useValue: pool },
        DiagramsRepository,
        DiagramsService,
        McpService,
      ],
    }
  }
}
