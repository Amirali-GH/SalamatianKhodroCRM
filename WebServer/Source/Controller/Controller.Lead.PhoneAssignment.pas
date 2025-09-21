Unit Controller.Lead.PhoneAssignment;

Interface

Uses
    System.SysUtils,
    System.Classes,
    System.Generics.Collections,
    MVCFramework,
    MVCFramework.Commons,
    MVCFramework.ActiveRecord,
    MVCFramework.Nullables,
    MVCFramework.Logger,
    Service.Interfaces,
    Model.Lead.PhoneAssignment,
    WebModule.SalamtCRM;

Type
    [MVCPath(BASE_API_V1 + '/phoneassignment')]
    TPhoneAssignmentController = Class(TMVCController)
    Public
        [MVCPath('')]
        [MVCHTTPMethods([httpGET])]
        [MVCProduces(TMVCMediaType.APPLICATION_JSON)]
        [MVCConsumes(TMVCMediaType.APPLICATION_JSON)]
        Procedure GetAllAssignments(Const [MVCInject] APhoneAssignmentService: IPhoneAssignmentService);


        [MVCPath('/($AAssignmentID)')]
        [MVCHTTPMethods([httpGET])]
        [MVCProduces(TMVCMediaType.APPLICATION_JSON)]
        [MVCConsumes(TMVCMediaType.APPLICATION_JSON)]
        Procedure GetAssignmentByID(Const AAssignmentID: String;
          Const [MVCInject] AAssignmentService: IPhoneAssignmentService);

        [MVCPath('')]
        [MVCHTTPMethods([httpPOST])]
        [MVCProduces(TMVCMediaType.APPLICATION_JSON)]
        [MVCConsumes(TMVCMediaType.APPLICATION_JSON)]
        Procedure CreateAssignment(Const [MVCInject] AAssignmentService: IPhoneAssignmentService);

        [MVCPath('/($AAssignmentID)')]
        [MVCHTTPMethods([httpPUT])]
        [MVCProduces(TMVCMediaType.APPLICATION_JSON)]
        [MVCConsumes(TMVCMediaType.APPLICATION_JSON)]
        Procedure UpdateAssignment(Const AAssignmentID: String;
          Const [MVCInject] AAssignmentService: IPhoneAssignmentService);

        [MVCPath('/($AAssignmentID)')]
        [MVCHTTPMethods([httpDELETE])]
        [MVCProduces(TMVCMediaType.APPLICATION_JSON)]
        [MVCConsumes(TMVCMediaType.APPLICATION_JSON)]
        Procedure DeleteAssignment(Const AAssignmentID: String;
          Const [MVCInject] AAssignmentService: IPhoneAssignmentService);
    End;

Implementation

Uses
    MVCFramework.Serializer.Commons,
    System.JSON, FireDAC.Stan.Error,
    System.StrUtils;

{ TPhoneAssignmentController }

//________________________________________________________________________________________
Procedure TPhoneAssignmentController.GetAllAssignments(Const APhoneAssignmentService: IPhoneAssignmentService);
Var
    LAssignmentList: TObjectList<TPhoneAssignment>;
    LEqualIndex: Integer;
    LPageArrayData: TArray<string>;
    LCurrPage, LPageData, Key, Value, LBranchID, LSourceID: String;
    LMetaJSON, LPageJSON: TJSONObject;
    LTotalSize: Integer;
Begin
    LMetaJSON := TJSONObject.Create;
    Try
        Try
            LCurrPage := Context.Request.Params['page'];
            LBranchID := Context.Request.Params['branchid'];
            LSourceID := Context.Request.Params['sourceid'];

            LAssignmentList := APhoneAssignmentService.GetAllAssignments(LCurrPage, LBranchID, LSourceID, LTotalSize);

            If Assigned(LAssignmentList) then
            Begin
                LPageJSON := TJSONObject.Create;
                Try
                    LPageArrayData := GetPaginationData(lCurrPage.ToInteger,
                                                        LAssignmentList.Count,
                                                        PAGE_SIZE,
                                                        BASE_API_V1 + '/phoneassignment?branchid=' + IfThen(LBranchID.IsEmpty, '0', LBranchID) +
                                                                      '&page=($page)')
                                                      .ToString.Split([';']);
                    For LPageData in LPageArrayData do
                    Begin
                        LEqualIndex := LPageData.IndexOf('=');
                        If (LEqualIndex > 0) then
                        Begin
                            Key := LPageData.Substring(0, LEqualIndex).Trim;
                            Value := LPageData.Substring(LEqualIndex + 1).Trim;
                            LPageJSON.AddPair(Key, Value);
                        End;
                    End;
                    LPageJSON.AddPair('total_size', LTotalSize);

                    LMetaJSON.AddPair('page', LPageJSON);
                    LMetaJSON.AddPair('data_type', 'list<vw_phone_assignment>');
                    LMetaJSON.AddPair('count', LAssignmentList.Count);
                    LMetaJSON.AddPair('is_success', True);
                    LMetaJSON.AddPair('description', 'لیست تخصیص های تلفن');

                    Render(HTTP_STATUS.OK,
                        ObjectDict(False)
                          .Add('meta', StrToJSONObject(LMetaJSON.ToString))
                          .Add('data', LAssignmentList,
                              Procedure(Const Obj: TObject; Const Links: IMVCLinks)
                              Begin
                                  Links.AddRefLink
                                        .Add(HATEOAS._TYPE, TMVCMediaType.APPLICATION_JSON)
                                        .Add(HATEOAS.HREF, Format(BASE_API_V1 + '/phoneassignment/%s', [TPhoneAssignment(Obj).Phone]))
                                        .Add(HATEOAS.REL, 'self');
                              End)
                    );
                Finally
                    LAssignmentList.Free;
                End;
            End
            Else
            Begin
                Raise Exception.Create('هنگام خواندن تخصیص های تلفن خطایی رخ داده است!');
            End;
        Except
            On E: Exception do
            Begin
                Log.Error(E.Message, 'Error');
                LMetaJSON.AddPair('data_type', 'list<vw_phone_assignment>');
                LMetaJSON.AddPair('count', 0);
                LMetaJSON.AddPair('total_size', 0);
                LMetaJSON.AddPair('is_success', False);
                LMetaJSON.AddPair('description', E.Message);

                Render(HTTP_STATUS.InternalServerError,
                    ObjectDict(True)
                      .Add('meta', StrToJSONObject(LMetaJSON.ToString))
                      .Add('data', TList.Create)
                );
            End;
        End;
    Finally
        LMetaJSON.Free;
    End;
End;
//________________________________________________________________________________________
Procedure TPhoneAssignmentController.GetAssignmentByID(Const AAssignmentID: String;
  Const AAssignmentService: IPhoneAssignmentService);
Var
    LStatusCode, LAssignmentID: Int64;
    LAssignment: TCustomer_Assignment;
    LMetaJSON: TJSONObject;
Begin
    LMetaJSON := TJSONObject.Create;
    Try
        LStatusCode := HTTP_STATUS.InternalServerError;
        Try
            If (AAssignmentID.IsEmpty) OR (Not TryStrToInt64(AAssignmentID, LAssignmentID)) Then
            Begin
                LStatusCode := HTTP_STATUS.NotFound;
                Raise EMVCException.Create('شناسه تخصیص نامعتبر است!');
            End;

            LAssignment := AAssignmentService.GetAssignmentByID(LAssignmentID);
            If Assigned(LAssignment) Then
            Begin
                Try
                    LStatusCode := HTTP_STATUS.OK;

                    LMetaJSON.AddPair('data_type', 'model_customer_assignment');
                    LMetaJSON.AddPair('count', 1);
                    LMetaJSON.AddPair('is_success', True);
                    LMetaJSON.AddPair('description', Format('تخصیص به کد %s یافت شد.', [LAssignment.Phone]));

                    Render(LStatusCode,
                        ObjectDict(False)
                          .Add('meta', StrToJSONObject(LMetaJSON.ToString))
                          .Add('data', LAssignment)
                    );
                Finally
                    LAssignment.Free;
                End;
            End
            Else
            Begin
                LStatusCode := HTTP_STATUS.NotFound;
                Raise EMVCException.Create('تخصیص یافت نشد');
            End;
        Except
            On E: Exception do
            Begin
                LMetaJSON.AddPair('data_type', 'model_customer_assignment');
                LMetaJSON.AddPair('count', 0);
                LMetaJSON.AddPair('is_success', False);
                LMetaJSON.AddPair('description', E.Message);

                Render(LStatusCode,
                    ObjectDict(True)
                      .Add('meta', StrToJSONObject(LMetaJSON.ToString))
                      .Add('data', TMVCObjectDictionary.Create())
                );
            End;
        End;
    Finally
        LMetaJSON.Free;
    End;
End;
//________________________________________________________________________________________
Procedure TPhoneAssignmentController.CreateAssignment(Const AAssignmentService: IPhoneAssignmentService);
Var
    LAssignmentInput: TCustomer_Assignment;
    LCreated: TCustomer_Assignment;
    LMetaJSON: TJSONObject;
    LStatusCode: Integer;
Begin
    LMetaJSON := TJSONObject.Create;
    Try
        LStatusCode := HTTP_STATUS.InternalServerError;
        Try
            LAssignmentInput := Context.Request.BodyAs<TCustomer_Assignment>;
            If Not Assigned(LAssignmentInput) Then
            Begin
                LStatusCode := HTTP_STATUS.BadRequest;
                Raise EMVCException.Create('داده ورودی نامعتبر است');
            End;

            Try
                LCreated := Nil;
                Try
                    LCreated := AAssignmentService.CreateAssignment(LAssignmentInput);
                Except
                    On E: EFDException do
                    Begin
                        If Assigned(LCreated) then
                        Begin
                            LCreated.Free;
                        End;

                        If Pos('duplicate', E.Message.ToLower) > 0 then
                        Begin
                            LStatusCode := HTTP_STATUS.Conflict;
                            Raise EMVCException.Create('شماره تلفن تخصیص تکراری است')
                        End
                        Else
                        Begin
                            Raise EMVCException.Create('خطای پایگاه داده: ' + E.Message);
                        End;
                    End;

                    On E: Exception do
                    Begin
                        Raise EMVCException.Create(E.Message);
                    End;
                End;
                Try
                    LStatusCode := HTTP_STATUS.Created;

                    LMetaJSON.AddPair('data_type', 'model_customer_assignment');
                    LMetaJSON.AddPair('count', 1);
                    LMetaJSON.AddPair('is_success', True);
                    LMetaJSON.AddPair('url', BASE_API_V1 + '/assignment/' + LCreated.AssignmentID.ToString);
                    LMetaJSON.AddPair('description', 'تخصیص با موفقیت ذخیره شد.');

                    Render(LStatusCode,
                        ObjectDict(False)
                          .Add('meta', StrToJSONObject(LMetaJSON.ToString))
                          .Add('data', LCreated)
                    );
                Finally
                    LCreated.Free;
                End;
            Finally
                LAssignmentInput.Free;
            End;
        Except
            On E: Exception do
            Begin
                LMetaJSON.AddPair('data_type', 'model_customer_assignment');
                LMetaJSON.AddPair('count', 0);
                LMetaJSON.AddPair('is_success', False);
                LMetaJSON.AddPair('description', E.Message);

                Render(LStatusCode,
                    ObjectDict(True)
                      .Add('meta', StrToJSONObject(LMetaJSON.ToString))
                      .Add('data', TMVCObjectDictionary.Create())
                );
            End;
        End;
    Finally
        LMetaJSON.Free;
    End;
End;
//________________________________________________________________________________________
Procedure TPhoneAssignmentController.UpdateAssignment(Const AAssignmentID: String;
  Const AAssignmentService: IPhoneAssignmentService);
Var
    LAssignmentID: Int64;
    LAssignmentInput: TCustomer_Assignment;
    LUpdated: TCustomer_Assignment;
    LMetaJSON: TJSONObject;
    LStatusCode: Integer;
Begin
    LMetaJSON := TJSONObject.Create;
    Try
        LStatusCode := HTTP_STATUS.InternalServerError;
        Try
            If (AAssignmentID.IsEmpty) OR (Not TryStrToInt64(AAssignmentID, LAssignmentID)) Then
            Begin
                LStatusCode := HTTP_STATUS.NotFound;
                Raise EMVCException.Create('شناسه تخصیص نامعتبر است!');
            End;

            LAssignmentInput := Context.Request.BodyAs<TCustomer_Assignment>;
            If Not Assigned(LAssignmentInput) Then
            Begin
                LStatusCode := HTTP_STATUS.BadRequest;
                Raise EMVCException.Create('داده ورودی نامعتبر است');
            End;

            Try
                Try
                    LUpdated := AAssignmentService.UpdateAssignmentPartial(LAssignmentID, LAssignmentInput);
                Except
                    On E: EFDException do
                    Begin
                        If Pos('duplicate', E.Message.ToLower) > 0 then
                        Begin
                            LStatusCode := HTTP_STATUS.Conflict;
                            Raise EMVCException.Create('شماره تلفن تخصیص تکراری است')
                        End
                        Else
                        Begin
                            Raise EMVCException.Create('خطای پایگاه داده: ' + E.Message);
                        End;
                    End;

                    On E: Exception do
                    Begin
                        Raise EMVCException.Create(E.Message);
                    End;
                End;

                If Not Assigned(LUpdated) Then
                Begin
                    LStatusCode := HTTP_STATUS.NotFound;
                    Raise EMVCException.Create('تخصیص یافت نشد');
                End;

                Try
                    LStatusCode := HTTP_STATUS.OK;

                    LMetaJSON.AddPair('data_type', 'model_customer_assignment');
                    LMetaJSON.AddPair('count', 1);
                    LMetaJSON.AddPair('is_success', True);
                    LMetaJSON.AddPair('description', 'تخصیص با موفقیت بروزرسانی شد.');

                    Render(LStatusCode,
                        ObjectDict(False)
                          .Add('meta', StrToJSONObject(LMetaJSON.ToString))
                          .Add('data', LUpdated)
                    );
                Finally
                    LUpdated.Free;
                End;
            Finally
                LAssignmentInput.Free;
            End;
        Except
            On E: Exception do
            Begin
                LMetaJSON.AddPair('data_type', 'model_customer_assignment');
                LMetaJSON.AddPair('count', 0);
                LMetaJSON.AddPair('is_success', False);
                LMetaJSON.AddPair('description', E.Message);

                Render(LStatusCode,
                    ObjectDict(True)
                      .Add('meta', StrToJSONObject(LMetaJSON.ToString))
                      .Add('data', TMVCObjectDictionary.Create())
                );
            End;
        End;
    Finally
        LMetaJSON.Free;
    End;
End;
//________________________________________________________________________________________
Procedure TPhoneAssignmentController.DeleteAssignment(Const AAssignmentID: String;
  Const AAssignmentService: IPhoneAssignmentService);
Var
    LStatusCode, LAssignmentID: Int64;
    LMetaJSON: TJSONObject;
Begin
    LMetaJSON := TJSONObject.Create;
    Try
        LStatusCode := HTTP_STATUS.InternalServerError;
        Try
            If (AAssignmentID.IsEmpty) OR (Not TryStrToInt64(AAssignmentID, LAssignmentID)) Then
            Begin
                LStatusCode := HTTP_STATUS.NotFound;
                Raise EMVCException.Create('شناسه تخصیص نامعتبر است!');
            End;

            If AAssignmentService.DeleteAssignment(LAssignmentID) Then
            Begin
                LStatusCode := HTTP_STATUS.OK;

                LMetaJSON.AddPair('data_type', 'integer');
                LMetaJSON.AddPair('count', 1);
                LMetaJSON.AddPair('is_success', True);
                LMetaJSON.AddPair('description', 'تخصیص با موفقیت حذف شد.');

                Render(LStatusCode,
                    ObjectDict(True)
                      .Add('meta', StrToJSONObject(LMetaJSON.ToString))
                      .Add('data', StrToJSONObject(TJSONObject.Create(TJSONPair.Create('assignmentid', LAssignmentID)).ToString))
                );
            End
            Else
            Begin
                LStatusCode := HTTP_STATUS.NotFound;
                Raise EMVCException.Create('تخصیص مورد نظر یافت نشد!');
            End;
        Except
            On E: Exception do
            Begin
                LMetaJSON.AddPair('data_type', 'integer');
                LMetaJSON.AddPair('count', 0);
                LMetaJSON.AddPair('is_success', False);
                LMetaJSON.AddPair('description', E.Message);

                Render(LStatusCode,
                    ObjectDict(True)
                      .Add('meta', StrToJSONObject(LMetaJSON.ToString))
                      .Add('data', TMVCObjectDictionary.Create())
                );
            End;
        End;
    Finally
        LMetaJSON.Free;
    End;
End;
//________________________________________________________________________________________

End.
