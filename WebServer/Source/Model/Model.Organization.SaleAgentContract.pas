Unit Model.Organization.SaleAgentContract;

Interface

Uses
    MVCFramework.ActiveRecord,
    MVCFramework.Nullables,
    MVCFramework.Serializer.Commons,
    System.Generics.Collections;

Type
    [MVCNameCase(ncLowerCase)]
    [MVCTable('organization_saleagentcontract')]
    [MVCEntityActions([eaRetrieve, eaCreate, eaUpdate, eaDelete])]
    TOrganization_SaleAgentContract = Class(TMVCActiveRecord)
    Private
        [MVCTableField('ContractID', [foPrimaryKey])]
        FContractID: Int64;

        [MVCTableField('SaleAgentID')]
        FSaleAgentID: Int32;

        [MVCTableField('Code')]
        FCode: NullableString;

        [MVCTableField('TargetAmount')]
        FTargetAmount: NullableDouble;

        [MVCTableField('CommissionRate')]
        FCommissionRate: NullableDouble;

        [MVCTableField('PeriodMonths')]
        FPeriodMonths: NullableInt32;

        [MVCTableField('ContractType')]
        FContractType: NullableString;

        [MVCTableField('Region')]
        FRegion: NullableString;

        [MVCTableField('StartDate')]
        FStartDate: TDate;

        [MVCTableField('EndDate')]
        FEndDate: NullableTDate;

        [MVCTableField('Description')]
        FDescription: NullableString;

        [MVCTableField('IsActive')]
        FIsActive: NullableBoolean;

        [MVCTableField('AutoRenew')]
        FAutoRenew: NullableBoolean;

        [MVCTableField('CreatedAt')]
        FCreatedAt: NullableTDateTime;

    Public
        Property ContractID: Int64 Read FContractID Write FContractID;
        Property SaleAgentID: Int32 Read FSaleAgentID Write FSaleAgentID;
        Property Code: NullableString Read FCode Write FCode;
        Property TargetAmount: NullableDouble Read FTargetAmount Write FTargetAmount;
        Property CommissionRate: NullableDouble Read FCommissionRate Write FCommissionRate;
        Property PeriodMonths: NullableInt32 Read FPeriodMonths Write FPeriodMonths;
        Property ContractType: NullableString Read FContractType Write FContractType;
        Property Region: NullableString Read FRegion Write FRegion;
        Property StartDate: TDate Read FStartDate Write FStartDate;
        Property EndDate: NullableTDate Read FEndDate Write FEndDate;
        Property Description: NullableString Read FDescription Write FDescription;
        Property IsActive: NullableBoolean Read FIsActive Write FIsActive;
        Property AutoRenew: NullableBoolean Read FAutoRenew Write FAutoRenew;
        Property CreatedAt: NullableTDateTime Read FCreatedAt Write FCreatedAt;
    End;

Implementation

End.

