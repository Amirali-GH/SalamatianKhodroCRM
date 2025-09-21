Unit Service.Organization.SaleAgentContract;

Interface

Uses
   System.SysUtils,
   System.Generics.Collections,
   MVCFramework.ActiveRecord,
   MVCFramework.Nullables,
   Model.Organization.SaleAgentContract,
   Service.Interfaces;

Type
   TSaleAgentContractService = Class(TInterfacedObject, ISaleAgentContractService)
   Public
      Function GetAllContracts(Var APage: String; Const AStatus: String; Const AContext: String): TObjectList<TOrganization_SaleAgentContract>;
      Function GetContractByID(Const AID: Int64): TOrganization_SaleAgentContract;
      Function CreateContract(Const AContract: TOrganization_SaleAgentContract): TOrganization_SaleAgentContract;
      Function UpdateContractPartial(Const AID: Int64; Const AContract: TOrganization_SaleAgentContract): TOrganization_SaleAgentContract;
      Function DeleteContract(Const AID: Int64): Boolean;
   End;

Implementation

Uses Utils, Math, StrUtils, WebModule.SalamtCRM;

{ TSaleAgentContractService }

//________________________________________________________________________________________
Function TSaleAgentContractService.GetAllContracts(Var APage: String; Const AStatus: String;
  Const AContext: String): TObjectList<TOrganization_SaleAgentContract>;
Var
   LCurrPage: Integer;
   LFirstRec: Integer;
   LActive, LSearchField: String;
Begin
   LCurrPage := 0;
   TryStrToInt(APage, LCurrPage);

   LCurrPage := Max(LCurrPage, 1);
   LFirstRec := (LCurrPage - 1) * PAGE_SIZE;
   APage := LCurrPage.ToString;

   If (Not AContext.IsEmpty) then
   Begin
      LSearchField := Format(
        '(Code LIKE %s OR ContractType LIKE %s OR Region LIKE %s)',
        [QuotedStr('%' + AContext + '%'), QuotedStr('%' + AContext + '%'), QuotedStr('%' + AContext + '%')]
      );
   End
   Else
   Begin
      LSearchField := '';
   End;

   If (AStatus.IsEmpty) Or (AStatus.ToLower = 'active') then
   Begin
      LActive := 'IsActive = 1';
   End
   Else If (AStatus.ToLower = 'notactive') then
   Begin
      LActive := 'IsActive = 0';
   End
   Else
   Begin
      LActive := '1=1';
   End;

   If (Not LSearchField.IsEmpty) AND (Not LActive.IsEmpty) then
   Begin
      LActive := ' AND ' + LActive;
   End;

   Result := TMVCActiveRecord.Where<TOrganization_SaleAgentContract>(
     LSearchField + LActive + ' ORDER BY StartDate DESC limit ?,?',
     [LFirstRec, PAGE_SIZE]);
End;
//________________________________________________________________________________________
Function TSaleAgentContractService.GetContractByID(Const AID: Int64): TOrganization_SaleAgentContract;
Begin
   Result := TMVCActiveRecord.GetByPK<TOrganization_SaleAgentContract>(AID, False);
End;
//________________________________________________________________________________________
Function TSaleAgentContractService.CreateContract(Const AContract: TOrganization_SaleAgentContract): TOrganization_SaleAgentContract;
Var
   LCopy: TOrganization_SaleAgentContract;
Begin
   LCopy := TOrganization_SaleAgentContract.Create;
   Try
      LCopy.SaleAgentID     := AContract.SaleAgentID;
      LCopy.Code            := AContract.Code;
      LCopy.TargetAmount    := AContract.TargetAmount;
      LCopy.CommissionRate  := AContract.CommissionRate;
      LCopy.PeriodMonths    := AContract.PeriodMonths;
      LCopy.ContractType    := AContract.ContractType;
      LCopy.Region          := AContract.Region;
      LCopy.StartDate       := AContract.StartDate;
      LCopy.EndDate         := AContract.EndDate;
      LCopy.Description     := AContract.Description;
      LCopy.AutoRenew       := AContract.AutoRenew;

      If (AContract.IsActive.HasValue) then
         LCopy.IsActive := AContract.IsActive
      Else
         LCopy.IsActive := True;

      LCopy.Insert;
      Result := GetContractByID(LCopy.ContractID);
   Except
      LCopy.Free;
      Raise;
   End;
End;
//________________________________________________________________________________________
Function TSaleAgentContractService.UpdateContractPartial(Const AID: Int64; Const AContract: TOrganization_SaleAgentContract): TOrganization_SaleAgentContract;
Var
   LExisting: TOrganization_SaleAgentContract;
Begin
   LExisting := TMVCActiveRecord.GetByPK<TOrganization_SaleAgentContract>(AID, False);
   If Not Assigned(LExisting) Then
      Exit(nil);

   Try
      If (AContract.Code.HasValue) Then
         LExisting.Code := AContract.Code;

      If (AContract.TargetAmount.HasValue) Then
         LExisting.TargetAmount := AContract.TargetAmount;

      If (AContract.CommissionRate.HasValue) Then
         LExisting.CommissionRate := AContract.CommissionRate;

      If (AContract.PeriodMonths.HasValue) Then
         LExisting.PeriodMonths := AContract.PeriodMonths;

      If (AContract.ContractType.HasValue) Then
         LExisting.ContractType := AContract.ContractType;

      If (AContract.Region.HasValue) Then
         LExisting.Region := AContract.Region;

      If (AContract.StartDate <> 0) Then
         LExisting.StartDate := AContract.StartDate;

      If (AContract.EndDate.HasValue) Then
         LExisting.EndDate := AContract.EndDate;

      If (AContract.Description.HasValue) Then
         LExisting.Description := AContract.Description;

      If (AContract.IsActive.HasValue) Then
         LExisting.IsActive := AContract.IsActive;

      If (AContract.AutoRenew.HasValue) Then
         LExisting.AutoRenew := AContract.AutoRenew;

      LExisting.Update;
      Result := LExisting;
   Except
      LExisting.Free;
      Raise;
   End;
End;
//________________________________________________________________________________________
Function TSaleAgentContractService.DeleteContract(Const AID: Int64): Boolean;
Var
   LExisting: TOrganization_SaleAgentContract;
Begin
   LExisting := TMVCActiveRecord.GetByPK<TOrganization_SaleAgentContract>(AID, False);
   If Not Assigned(LExisting) Then
      Exit(False);

   Try
      LExisting.Delete;
      Result := True;
   Finally
      LExisting.Free;
   End;
End;
//________________________________________________________________________________________

End.

