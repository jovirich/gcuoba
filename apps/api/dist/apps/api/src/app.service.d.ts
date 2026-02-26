import { Connection } from 'mongoose';
export declare class AppService {
    private readonly mongoConnection;
    constructor(mongoConnection: Connection);
    getHello(): string;
    getHealth(): Promise<{
        status: string;
        app: string;
        db: "ok" | "error";
        time: string;
    }>;
}
