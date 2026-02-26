import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService {
    constructor(
        @InjectConnection() private readonly mongoConnection: Connection,
    ) {}

    getHello(): string {
        return 'Hello World!';
    }

    async getHealth() {
        let db: 'ok' | 'error' = 'ok';
        try {
            if (!this.mongoConnection.db) {
                throw new Error('Mongo connection is not ready');
            }
            await this.mongoConnection.db.admin().ping();
        } catch {
            db = 'error';
        }

        return {
            status: 'ok',
            app: 'gcuoba-ts-api',
            db,
            time: new Date().toISOString(),
        };
    }
}
