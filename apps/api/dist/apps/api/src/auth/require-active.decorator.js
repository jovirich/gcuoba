"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireActive = exports.REQUIRE_ACTIVE_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.REQUIRE_ACTIVE_KEY = 'requireActive';
const RequireActive = () => (0, common_1.SetMetadata)(exports.REQUIRE_ACTIVE_KEY, true);
exports.RequireActive = RequireActive;
//# sourceMappingURL=require-active.decorator.js.map