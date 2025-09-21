Unit Controller.ContractUpload;

Interface

Uses
    System.JSON,
    MVCFramework,
    MVCFramework.Commons,
    MVCFramework.SQLGenerators.MSSQL,
    MVCFramework.ActiveRecord,
    MVCFramework.Nullables,
    FireDAC.Phys.MSSQL,
    System.Variants,
    System.Generics.Collections,
    Model.User,
    IdHash,
    Service.Interfaces,
    WebModule.SalamtCRM, Model.ContractRaw,
    Service.Contract.FileResultContract;  // Assuming a similar service for contracts

Type
    [MVCPath(BASE_API_V1 + '/upload')]
    TContractUploadController = class(TMVCController)
    Public
        [MVCPath('/contract/sheet')]
        [MVCHTTPMethods([httpPost])]
        [MVCConsumes(TMVCMediaType.APPLICATION_JSON)]
        Procedure GetContract(
          Const [MVCInject] AContractUploadService: IContractUploadService;  // New interface for contracts
          Const [MVCInject] AFileResultService: IFileResultContractService;  // Assuming a similar interface for contracts
          Const [MVCFromBody] AContractRaw: TObjectList<TContractRaw>);
End;

Implementation

Uses
    Web.ReqFiles,
    System.SysUtils,
    System.Classes,
    MVCFramework.Logger,
    Model.Contract.FileResultContract;  // Assuming a model for contract file result

{ TContractUploadController }
//________________________________________________________________________________________
Procedure TContractUploadController.GetContract(
    Const AContractUploadService: IContractUploadService;
    Const AFileResultService: IFileResultContractService;
    Const AContractRaw: TObjectList<TContractRaw>);
Var
    LFileSize, LUserID, LFileName: String;
Begin
    If (Context.Request.Body.IsEmpty) then
        raise EMVCException.Create(HTTP_STATUS.NoContent, 'هیچ فایلی آپلود نشده است')

    Else If (Not Assigned(AContractRaw)) then
        raise EMVCException.Create(HTTP_STATUS.NotAcceptable, 'فرمت اکسل وارد شده درست نمی باشد!')

    Else If (AContractRaw.IsEmpty) then
        raise EMVCException.Create(HTTP_STATUS.NoContent, 'فایل آپلود شده حاوی هیچ اطلاعاتی نمی باشد!');

    LUserID   := Context.LoggedUser.CustomData.Items['userid'];
    LFileName := Context.Request.QueryStringParam('filename');
    LFileSize := Context.Request.QueryStringParam('filesize');

    If (LFileName.IsEmpty) then
      raise EMVCException.Create(HTTP_STATUS.NoContent, 'نام فایل آپلود شده یافت نشد!')
    Else If (LFileSize.IsEmpty) then
      raise EMVCException.Create(HTTP_STATUS.NoContent, 'محاسبه ی اندازه ی فایل با مشکل مواجه شد!');

    Try
        If Not AContractUploadService.GetContractSheet(
            AFileResultService,
            AContractRaw,
            LUserID,
            LFileName,
            LFileSize) then
        Begin
            Raise EMVCException.Create(HTTP_STATUS.InternalServerError,
              'ذخیره‌سازی فایل با مشکل مواجه شد');
        End;

        Render(HTTP_STATUS.OK,'فایل با موفقیت ذخیره شد.');

    Except
        ON E: EMVCException do
          raise;

        ON E: Exception do
        Begin
            raise EMVCException.CreateFmt(HTTP_STATUS.InternalServerError,
              'خطا در پردازش فایل: %s', [E.Message]);
        End;
    End;
End;
//________________________________________________________________________________________

End.
