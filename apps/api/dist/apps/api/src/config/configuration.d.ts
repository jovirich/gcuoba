declare const _default: () => {
    database: {
        uri: string;
    };
    mail: {
        enabled: boolean;
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
        from: string;
        appName: string;
        appUrl: string;
        queueWorkerEnabled: boolean;
        queuePollSeconds: number;
        queueBatchSize: number;
    };
};
export default _default;
