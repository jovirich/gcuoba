"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationEmailWorkerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationEmailWorkerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const notification_email_queue_service_1 = require("./notification-email-queue.service");
let NotificationEmailWorkerService = NotificationEmailWorkerService_1 = class NotificationEmailWorkerService {
    configService;
    notificationEmailQueueService;
    logger = new common_1.Logger(NotificationEmailWorkerService_1.name);
    timer = null;
    running = false;
    lastRunAt = null;
    lastResult = null;
    constructor(configService, notificationEmailQueueService) {
        this.configService = configService;
        this.notificationEmailQueueService = notificationEmailQueueService;
    }
    onModuleInit() {
        if (!this.enabled()) {
            this.logger.log('Email queue worker is disabled.');
            return;
        }
        const pollSeconds = this.pollSeconds();
        this.timer = setInterval(() => {
            void this.runOnce();
        }, pollSeconds * 1000);
        this.logger.log(`Email queue worker started (poll=${pollSeconds}s, batch=${this.batchSize()}).`);
        void this.runOnce();
    }
    onModuleDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async runOnce() {
        if (this.running) {
            return { processed: 0, sent: 0, failed: 0, skipped: 0 };
        }
        this.running = true;
        try {
            const result = await this.notificationEmailQueueService.processPending(this.batchSize());
            this.lastResult = result;
            this.lastRunAt = new Date();
            return result;
        }
        catch (error) {
            this.logger.error(`Email queue worker run failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            this.lastResult = {
                processed: 0,
                sent: 0,
                failed: 0,
                skipped: 0,
            };
            this.lastRunAt = new Date();
            return this.lastResult;
        }
        finally {
            this.running = false;
        }
    }
    getStatus() {
        return {
            enabled: this.enabled(),
            running: this.running,
            pollSeconds: this.pollSeconds(),
            batchSize: this.batchSize(),
            lastRunAt: this.lastRunAt?.toISOString() ?? null,
            lastResult: this.lastResult,
        };
    }
    enabled() {
        return (this.configService.get('mail.queueWorkerEnabled') === true);
    }
    pollSeconds() {
        const value = this.configService.get('mail.queuePollSeconds') ?? 60;
        return Math.max(10, value);
    }
    batchSize() {
        const value = this.configService.get('mail.queueBatchSize') ?? 50;
        return Math.max(1, Math.min(200, value));
    }
};
exports.NotificationEmailWorkerService = NotificationEmailWorkerService;
exports.NotificationEmailWorkerService = NotificationEmailWorkerService = NotificationEmailWorkerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        notification_email_queue_service_1.NotificationEmailQueueService])
], NotificationEmailWorkerService);
//# sourceMappingURL=notification-email-worker.service.js.map