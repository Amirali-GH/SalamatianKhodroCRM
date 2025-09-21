Unit Model.CustomerRequest;

Interface

Uses
    MVCFramework.ActiveRecord,
    MVCFramework.Nullables,
    System.Generics.Collections;

Type
    [MVCNameCase(ncLowerCase))]
    TCustomerRequest = Class(TMVCActiveRecord)
    Private
        FPhone: String;
        FFirstName: NullableString;
        FLastName: NullableString;
        FNationalCode: NullableString;
        FRequestedVehicleCode: NullableString;
        FRequestedVehicleName: NullableString;
        FEmail: NullableString;
        FBudget: NullableDouble;
        FAddress: NullableString;
        FSaleAgentCode: String;
        FSaleAgentName: NullableString;
        FContactDate: TDateTime;
        FCustomerStatusCode: String;
        FNotes1: NullableString;
        FNotes2: NullableString;
        FNotes3: NullableString;
        FPotential: NullableString;

    Public
        Property Phone              : String    Read FPhone               Write FPhone;
        Property SaleAgentCode      : String    Read FSaleAgentCode       Write FSaleAgentCode;
        Property CustomerStatusCode : String    Read FCustomerStatusCode  Write FCustomerStatusCode;
        Property ContactDate        : TDateTime Read FContactDate         Write FContactDate;

        Property First_Name    : NullableString Read FFirstName    Write FFirstName;
        Property Last_Name     : NullableString Read FLastName     Write FLastName;
        Property National_Code : NullableString Read FNationalCode Write FNationalCode;
        Property Email         : NullableString Read FEmail        Write FEmail;
        Property Budget        : NullableDouble Read FBudget       Write FBudget;
        Property Address       : NullableString Read FAddress      Write FAddress;

        Property SaleAgentName: NullableString Read FSaleAgentName Write FSaleAgentName;
        Property Requested_Vehicle_Code: NullableString Read FRequestedVehicleCode Write FRequestedVehicleCode;
        Property Requested_Vehicle_Name: NullableString Read FRequestedVehicleName Write FRequestedVehicleName;
        Property Potential: NullableString Read FPotential Write FPotential;
        Property Notes1: NullableString Read FNotes1 Write FNotes1;
        Property Notes2: NullableString Read FNotes2 Write FNotes2;
        Property Notes3: NullableString Read FNotes3 Write FNotes3;
    End;

Implementation

End.

