"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const audit_logs_module_1 = require("../modules/audit-logs/audit-logs.module");
const branches_module_1 = require("../modules/branches/branches.module");
const classes_module_1 = require("../modules/classes/classes.module");
const houses_module_1 = require("../modules/houses/houses.module");
const memberships_module_1 = require("../modules/memberships/memberships.module");
const notifications_module_1 = require("../modules/notifications/notifications.module");
const profiles_module_1 = require("../modules/profiles/profiles.module");
const role_assignments_module_1 = require("../modules/role-assignments/role-assignments.module");
const users_module_1 = require("../modules/users/users.module");
const user_schema_1 = require("../modules/users/schemas/user.schema");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const jwt_strategy_1 = require("./jwt.strategy");
const password_reset_token_schema_1 = require("./schemas/password-reset-token.schema");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            profiles_module_1.ProfilesModule,
            memberships_module_1.MembershipsModule,
            branches_module_1.BranchesModule,
            classes_module_1.ClassesModule,
            houses_module_1.HousesModule,
            notifications_module_1.NotificationsModule,
            audit_logs_module_1.AuditLogsModule,
            role_assignments_module_1.RoleAssignmentsModule,
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: password_reset_token_schema_1.PasswordResetToken.name, schema: password_reset_token_schema_1.PasswordResetTokenSchema },
            ]),
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET') || 'dev-secret',
                    signOptions: { expiresIn: '1d' },
                }),
            }),
        ],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy],
        controllers: [auth_controller_1.AuthController],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map