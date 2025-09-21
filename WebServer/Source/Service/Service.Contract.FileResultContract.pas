Unit Service.Contract.FileResultContract;

Interface

Uses
    System.SysUtils,
    System.Generics.Collections,
    MVCFramework.ActiveRecord,
    MVCFramework.Nullables,
    Model.Contract.FileResultContract,
    Service.Interfaces;

Type
    TFileResultContractService = Class(TInterfacedObject, IFileResultContractService)
    Public
        Function GetAllFileResults(Var APage: String; Const AContext: String): TObjectList<TContract_FileResult>;
        Function GetFileResultByID(Const AID: Int64): TContract_FileResult;
        Function CreateFileResult(Const AFileResult: TContract_FileResult): TContract_FileResult;
        Function UpdateFileResultPartial(Const AID: Int64; Const AFileResult: TContract_FileResult): TContract_FileResult;
        Function DeleteFileResult(Const AID: Int64): Boolean;
    End;

Implementation

Uses Utils, Math, StrUtils, WebModule.SalamtCRM;

{ TFileResultContractService }

//________________________________________________________________________________________
Function TFileResultContractService.GetAllFileResults(Var APage: String;
  Const AContext: String): TObjectList<TContract_FileResult>;
Var
    LCurrPage: Integer;
    LFirstRec: Integer;
    LSearchField: String;
Begin
    LCurrPage := 0;
    TryStrToInt(APage, LCurrPage);

    LCurrPage := Max(LCurrPage, 1);
    LFirstRec := (LCurrPage - 1) * PAGE_SIZE;
    APage := LCurrPage.ToString;

    LSearchField := Format(
            '(FileName LIKE %s)',[QuotedStr('%' + AContext + '%')]
        );

    Result := TMVCActiveRecord.Where<TContract_FileResult>(
      LSearchField + ' ORDER BY FileName ASC limit ?,?',
      [LFirstRec, PAGE_SIZE]);
End;
//________________________________________________________________________________________
Function TFileResultContractService.GetFileResultByID(Const AID: Int64): TContract_FileResult;
Begin
    Result := TMVCActiveRecord.GetByPK<TContract_FileResult>(AID, False);
End;
//________________________________________________________________________________________
Function TFileResultContractService.CreateFileResult(Const AFileResult: TContract_FileResult): TContract_FileResult;
Var
    LCopy: TContract_FileResult;
Begin
    LCopy := TContract_FileResult.Create;
    Try
        LCopy.FileName := AFileResult.FileName;
        LCopy.UploadedByUserID := AFileResult.UploadedByUserID;
        LCopy.FileSize := AFileResult.FileSize;
        LCopy.ErrorMessage := AFileResult.ErrorMessage;
        LCopy.HasError_RunSP := AFileResult.HasError_RunSP;
        LCopy.HasError_InsertRawData := AFileResult.HasError_InsertRawData;

        LCopy.Insert;
        Result := GetFileResultByID(LCopy.ContractFileID);
    Except
        LCopy.Free;
        Raise;
    End;
End;
//________________________________________________________________________________________
Function TFileResultContractService.UpdateFileResultPartial(Const AID: Int64; Const AFileResult: TContract_FileResult): TContract_FileResult;
Var
    LExisting: TContract_FileResult;
Begin
    LExisting := TMVCActiveRecord.GetByPK<TContract_FileResult>(AID, False);
    If Not Assigned(LExisting) Then
    Begin
        Exit(nil);
    End;

    Try
        If (Not AFileResult.FileName.IsEmpty) Then
        Begin
            LExisting.FileName := AFileResult.FileName;
        End;

        If (AFileResult.UploadedByUserID.HasValue) Then
        Begin
            LExisting.UploadedByUserID := AFileResult.UploadedByUserID;
        End;

        If (AFileResult.FileSize.HasValue) Then
        Begin
            LExisting.FileSize := AFileResult.FileSize;
        End;

        If (AFileResult.ErrorMessage.HasValue) Then
        Begin
            LExisting.ErrorMessage := AFileResult.ErrorMessage;
        End;

        If (AFileResult.HasError_RunSP.HasValue) Then
        Begin
            LExisting.HasError_RunSP := AFileResult.HasError_RunSP;
        End;

        If (AFileResult.HasError_InsertRawData.HasValue) Then
        Begin
            LExisting.HasError_InsertRawData := AFileResult.HasError_InsertRawData;
        End;

        LExisting.Update;
        Result := LExisting;
    Except
        LExisting.Free;
        Raise;
    End;
End;
//________________________________________________________________________________________
Function TFileResultContractService.DeleteFileResult(Const AID: Int64): Boolean;
Var
    LExisting: TContract_FileResult;
Begin
    LExisting := TMVCActiveRecord.GetByPK<TContract_FileResult>(AID, False);
    If Not Assigned(LExisting) Then
    Begin
        Exit(False);
    End;

    Try
        LExisting.Delete;
        Result := True;
    Finally
        LExisting.Free;
    End;
End;
//________________________________________________________________________________________

End.
