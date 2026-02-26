declare const TITLES: readonly ["mr", "mrs", "ms", "chief", "dr", "prof"];
export declare class RegisterMemberDto {
    title: (typeof TITLES)[number];
    firstName: string;
    middleName?: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
    classId: string;
    branchId: string;
    houseId: string;
    note?: string;
    photoUrl?: string;
}
export {};
