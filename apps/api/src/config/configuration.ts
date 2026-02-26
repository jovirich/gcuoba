export default () => ({
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gcuoba',
    },
    mail: {
        enabled: process.env.MAIL_ENABLED === 'true',
        host: process.env.SMTP_HOST || 'localhost',
        port: Number(process.env.SMTP_PORT || 1025),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'noreply@gcuoba.local',
        appName: process.env.MAIL_APP_NAME || 'GCUOBA Portal',
        appUrl: process.env.MAIL_APP_URL || '',
        queueWorkerEnabled: process.env.EMAIL_QUEUE_WORKER_ENABLED === 'true',
        queuePollSeconds: Number(process.env.EMAIL_QUEUE_POLL_SECONDS || 60),
        queueBatchSize: Number(process.env.EMAIL_QUEUE_BATCH_SIZE || 50),
    },
});
