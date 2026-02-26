"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountriesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const role_assignments_module_1 = require("../role-assignments/role-assignments.module");
const countries_controller_1 = require("./countries.controller");
const countries_service_1 = require("./countries.service");
const country_schema_1 = require("./schemas/country.schema");
let CountriesModule = class CountriesModule {
};
exports.CountriesModule = CountriesModule;
exports.CountriesModule = CountriesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: country_schema_1.Country.name, schema: country_schema_1.CountrySchema },
            ]),
            role_assignments_module_1.RoleAssignmentsModule,
        ],
        controllers: [countries_controller_1.CountriesController],
        providers: [countries_service_1.CountriesService],
        exports: [countries_service_1.CountriesService],
    })
], CountriesModule);
//# sourceMappingURL=countries.module.js.map