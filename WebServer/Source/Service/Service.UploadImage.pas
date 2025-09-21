Unit Service.UploadImage;

Interface

Uses
    System.SysUtils,
    System.Classes,
    System.JSON,
    System.Generics.Collections,
    MVCFramework.ActiveRecord,
    FireDAC.Comp.Client,
    Web.ReqFiles,
    Service.Interfaces;

Type
    TImageUploadService = Class(TInterfacedObject, IImageUploadService)
    Public
        Function SaveUploadedImages(Const AFiles: TWebRequestFiles; Const AUserID: String): Boolean;
        Function GetImagesByBranch(Const BranchID: Int64; Const Page, PageSize: Integer): TJSONObject;
    End;

Implementation

Uses
    System.IOUtils,
    System.DateUtils,
    System.Math,
    System.StrUtils,
    MVCFramework.Logger,
    FireDac.Stan.Param,
    Data.DB;

{ TImageUploadService }

//________________________________________________________________________________________
Function TImageUploadService.SaveUploadedImages(
    Const AFiles: TWebRequestFiles; Const AUserID: String): Boolean;
Var
    i, j: Integer;
    LConn: TFDConnection;
    LQuery: TFDQuery;
    LGUIDFile, LFileExt, LSavedFileName, LSavedFullPath: String;
    LBaseUploadsDir: String;
    LTempFiles: TStringList;
    LUploadedIDs: TList<Int64>;
    LSavedGuids: TStringList;
    LBranchIDs: TList<Int64>;
    LMem: TMemoryStream;
    LFileSizeKB: Integer;
    LOrigName, LContentType: String;
    LImagePhoneID: Int64;

    LWidth, LHeight: Integer;

    // variables for distribution
    BranchCounts: TDictionary<Int64, Integer>;
    minBranchID: Int64;
    minCount, cnt: Integer;

    Function GetLastInsertID: Int64;
    Begin
        // این تابع برای MySQL نوشته شده است.
        LQuery.SQL.Text := 'SELECT LAST_INSERT_ID() AS id';
        LQuery.Open;
        Try
            Result := LQuery.FieldByName('id').AsLargeInt;
        Finally
            LQuery.Close;
        End;
    End;

Begin
    Result := False;

    If (AFiles = Nil) Or (AFiles.Count = 0) Then
        Exit;

    // مسیر ذخیره کنار exe: /uploads/
    LBaseUploadsDir := TPath.Combine(ExtractFilePath(ParamStr(0)), 'uploads');
    If Not TDirectory.Exists(LBaseUploadsDir) Then
        TDirectory.CreateDirectory(LBaseUploadsDir);

    LTempFiles := TStringList.Create;
    LUploadedIDs := TList<Int64>.Create;
    LSavedGuids := TStringList.Create;
    LBranchIDs := TList<Int64>.Create;
    LQuery := TFDQuery.Create(Nil);
    LMem := Nil;
    BranchCounts := Nil;

    Try
        Try
            LConn := TMVCActiveRecord.CurrentConnection As TFDConnection;
            If LConn = Nil Then
                Raise Exception.Create('ارتباط با دیتابیس برقرار نیست');

            LConn.StartTransaction;

            // -----------------------------
            //  ذخیره فایل‌ها و درج در customer_assign_image_phone
            // -----------------------------
            For i := 0 To AFiles.Count - 1 Do
            Begin
                LOrigName := AFiles.Items[i].FileName;
                LContentType := AFiles.Items[i].ContentType;

                If Not Assigned(AFiles.Items[i].Stream) Then
                    Raise Exception.CreateFmt('فایل %s استریم ندارد - قابلیت خواندن استریم پشتیبانی نشده', [LOrigName]);

                LMem := TMemoryStream.Create;
                Try
                    AFiles.Items[i].Stream.Position := 0;
                    LMem.CopyFrom(AFiles.Items[i].Stream, AFiles.Items[i].Stream.Size);

                    // تولید GUID اختصاصی برای هر فایل و ساخت نام ذخیره‌شده
                    LGUIDFile := TGUID.NewGuid.ToString; // 36 کاراکتر شامل '-'
                    LFileExt := ExtractFileExt(LOrigName);
                    If LFileExt = '' Then
                        LFileExt := '.bin';
                    LSavedFileName := LGUIDFile + LFileExt;
                    LSavedFullPath := TPath.Combine(LBaseUploadsDir, LSavedFileName);

                    // ذخیره فایل در پوشه مشترک uploads
                    LMem.Position := 0;
                    LMem.SaveToFile(LSavedFullPath);
                    LTempFiles.Add(LSavedFullPath);

                    // ذخیره GUID مربوط به این فایل جهت استفاده‌ی بعدی (برای تولید Phone کوتاه)
                    LSavedGuids.Add(LGUIDFile);

                    // اندازه فایل به KB
                    LFileSizeKB := Ceil(TFile.GetSize(LSavedFullPath) / 1024);

                    // تلاش برای خواندن عرض/ارتفاع (در صورت امکان)
                    LWidth := 0;
                    LHeight := 0;

                    // درج رکورد در customer_assign_image_phone
                    // توجه: ImageGuid اکنون GUID فایل (LGUIDFile) است
                    LQuery.Connection := LConn;
                    LQuery.SQL.Text :=
                      'INSERT INTO customer_assign_image_phone (ImageGuid, UploadDate, FileSizeKB, ContentType, OriginalFileName, Width, Height) ' +
                      'VALUES (:g, :ud, :fs, :ct, :on, :w, :h)';

                    LQuery.ParamByName('g').AsString := LGUIDFile;
                    LQuery.ParamByName('ud').AsDateTime := Now;
                    LQuery.ParamByName('fs').AsInteger := LFileSizeKB;
                    LQuery.ParamByName('ct').AsString := LContentType;
                    LQuery.ParamByName('on').AsString := LOrigName;
                    LQuery.ParamByName('w').AsInteger := LWidth;
                    LQuery.ParamByName('h').AsInteger := LHeight;

                    LQuery.ExecSQL;

                    // گرفتن ID آخرین درج (MySQL)
                    LImagePhoneID := GetLastInsertID;
                    LUploadedIDs.Add(LImagePhoneID);

                Finally
                    FreeAndNil(LMem);
                End;
            End;

            // -----------------------------
            //  دریافت BranchID ها
            // -----------------------------
            LQuery.SQL.Text := 'SELECT BranchID FROM branch_branch ORDER BY BranchID';
            LQuery.Open;
            Try
                While Not LQuery.Eof Do
                Begin
                    LBranchIDs.Add(LQuery.FieldByName('BranchID').AsLargeInt);
                    LQuery.Next;
                End;
            Finally
                LQuery.Close;
            End;

            If LBranchIDs.Count = 0 Then
                Raise Exception.Create('هیچ شاخه‌ای برای تخصیص یافت نشد');

            // -----------------------------
            //  محاسبه تعداد فعلی Assignmentهایی که ImagePhoneID دارند و SourceCollectingDataID = 4
            //  (برای هر BranchID)
            // -----------------------------
            BranchCounts := TDictionary<Int64, Integer>.Create;
            Try
                For j := 0 To LBranchIDs.Count - 1 Do
                Begin
                    LQuery.SQL.Text := 'SELECT COUNT(*) AS cnt FROM customer_assignment ' +
                                       'WHERE BranchID = :b AND ImagePhoneID IS NOT NULL AND SourceCollectingDataID = 4';
                    LQuery.ParamByName('b').AsLargeInt := LBranchIDs[j];
                    LQuery.Open;
                    Try
                        cnt := LQuery.FieldByName('cnt').AsInteger;
                    Finally
                        LQuery.Close;
                    End;
                    BranchCounts.AddOrSetValue(LBranchIDs[j], cnt);
                End;

                // -----------------------------
                //  درج در customer_assignment برای هر تصویر
                //  Phone از GUID تولید می‌شود (بدون '-') و با پیشوند 'IMG' تا 12 کاراکتر
                // -----------------------------
                For j := 0 To LUploadedIDs.Count - 1 Do
                Begin
                    // پیدا کردن شعبه با کمترین مقدار
                    minCount := MaxInt;
                    minBranchID := 0;
                    For i := 0 To LBranchIDs.Count - 1 Do
                    Begin
                        If Not BranchCounts.TryGetValue(LBranchIDs[i], cnt) Then
                            cnt := 0;
                        If cnt < minCount Then
                        Begin
                            minCount := cnt;
                            minBranchID := LBranchIDs[i];
                        End;
                    End;

                    If minBranchID = 0 Then
                        minBranchID := LBranchIDs[0];

                    // تولید مقدار Phone از GUID مربوط به این تصویر
                    // GUID را بدون '-' می‌کنیم و 9 کاراکتر اول را می‌گیریم و پیشوند IMG اضافه می‌کنیم -> طول 12
                    Var RawGuid := StringReplace(LSavedGuids[j], '-', '', [rfReplaceAll]);
                    Var ShortPart := Copy(RawGuid, 1, 9);
                    Var PhoneValue := 'IMG' + ShortPart; // طول = 3 + 9 = 12

                    // درج رکورد در customer_assignment با SourceCollectingDataID = 4
                    LQuery.SQL.Text := 'INSERT INTO customer_assignment (Phone, BranchID, SourceCollectingDataID, UserName, ImagePhoneID) ' +
                                       'VALUES (:p_phone, :p_branch, 4, :p_user, :p_imgid)';
                    LQuery.ParamByName('p_phone').AsString := PhoneValue;
                    LQuery.ParamByName('p_branch').AsLargeInt := minBranchID;
                    LQuery.ParamByName('p_user').AsString := AUserID;
                    LQuery.ParamByName('p_imgid').AsLargeInt := LUploadedIDs[j];
                    LQuery.ExecSQL;

                    // افزایش شمارش آن شاخه برای توازن بقیه تصاویر
                    If BranchCounts.TryGetValue(minBranchID, cnt) Then
                        BranchCounts.AddOrSetValue(minBranchID, cnt + 1)
                    Else
                        BranchCounts.AddOrSetValue(minBranchID, 1);
                End;

            Finally
                BranchCounts.Free;
            End;

            // -----------------------------
            //  پایان و Commit
            // -----------------------------
            LConn.Commit;
            Result := True;

        Except
            On E: Exception Do
            Begin
                // rollback و پاکسازی فایل‌های محلی
                Try
                    If Assigned(LConn) And LConn.InTransaction Then
                        LConn.Rollback;
                Except
                End;

                Try
                    For i := 0 To LTempFiles.Count - 1 Do
                        If TFile.Exists(LTempFiles[i]) Then
                            TFile.Delete(LTempFiles[i]);
                Except
                End;

                // بالا بردن خطا برای لاگ/پاسخ در controller
                Raise;
            End;
        End;
    Finally
        LTempFiles.Free;
        LSavedGuids.Free;
        LUploadedIDs.Free;
        LBranchIDs.Free;
        FreeAndNil(LQuery);
    End;
End;
//________________________________________________________________________________________
Function TImageUploadService.GetImagesByBranch(
    Const BranchID: Int64; Const Page, PageSize: Integer): TJSONObject;
Var
    LConn: TFDConnection;
    LQuery: TFDQuery;
    LCountQuery: TFDQuery;
    LOffset: Integer;
    LTotal: Int64;
    LArr: TJSONArray;
    LObj: TJSONObject;
    LImageGuid, LOrigName, LContentType: String;
    LImagePhoneID: Int64;
    LUploadDate: TDateTime;
    LFileSizeKB: Integer;
    LWidth, LHeight: Integer;
    // helper
    Function MakeSavedFileName(Const AGuid, AOrig: String): String;
    Var
        ext: String;
    Begin
        ext := ExtractFileExt(AOrig);
        If ext = '' Then
            ext := '.bin';
        Result := AGuid + ext;
    End;
Begin
    Result := Nil;
    LQuery := TFDQuery.Create(Nil);
    LCountQuery := TFDQuery.Create(Nil);
    Try
        LConn := TMVCActiveRecord.CurrentConnection As TFDConnection;
        If LConn = Nil Then
            Raise Exception.Create('No active DB connection');

        // محاسبه offset
        LOffset := (Max(1, Page) - 1) * Max(1, PageSize);

        // 1) گرفتن تعداد کل (distinct)
        //    برای اینکه از هر دو منبع (customer_assignment و mapping table) استفاده شود،
        //    از JOIN روی customer_assign_image_phone و شرط وجود در assignment یا mapping استفاده می‌کنیم
        LCountQuery.Connection := LConn;
        LCountQuery.SQL.Text :=
          'SELECT COUNT(DISTINCT p.ImagePhoneID) AS total' + sLineBreak +
          'FROM customer_assign_image_phone p' + sLineBreak +
          'LEFT JOIN customer_assignment a ON p.ImagePhoneID = a.ImagePhoneID AND a.BranchID = :b' + sLineBreak +
          'LEFT JOIN customer_assign_image_phone_branch m ON p.ImagePhoneID = m.ImagePhoneID AND m.BranchID = :b' + sLineBreak +
          'WHERE a.AssignmentID IS NOT NULL OR m.ImagePhoneID IS NOT NULL';
        LCountQuery.ParamByName('b').AsLargeInt := BranchID;
        LCountQuery.Open;
        Try
            LTotal := LCountQuery.FieldByName('total').AsLargeInt;
        Finally
            LCountQuery.Close;
        End;

        // 2) گرفتن داده‌ها با LIMIT / OFFSET (MySQL)
        LQuery.Connection := LConn;
        LQuery.SQL.Text :=
          'SELECT DISTINCT p.ImagePhoneID, p.ImageGuid, p.OriginalFileName, p.UploadDate, p.FileSizeKB, p.ContentType, p.Width, p.Height' + sLineBreak +
          'FROM customer_assign_image_phone p' + sLineBreak +
          'LEFT JOIN customer_assignment a ON p.ImagePhoneID = a.ImagePhoneID AND a.BranchID = :b' + sLineBreak +
          'LEFT JOIN customer_assign_image_phone_branch m ON p.ImagePhoneID = m.ImagePhoneID AND m.BranchID = :b' + sLineBreak +
          'WHERE a.AssignmentID IS NOT NULL OR m.ImagePhoneID IS NOT NULL' + sLineBreak +
          'ORDER BY p.UploadDate DESC' + sLineBreak +
          'LIMIT :off, :ps';
        LQuery.ParamByName('b').AsLargeInt := BranchID;
        LQuery.ParamByName('off').AsInteger := LOffset;
        LQuery.ParamByName('ps').AsInteger := PageSize;
        LQuery.Open;

        // ساخت JSON خروجی
        LArr := TJSONArray.Create;
        Try
            While Not LQuery.Eof Do
            Begin
                LImagePhoneID := LQuery.FieldByName('ImagePhoneID').AsLargeInt;
                LImageGuid := LQuery.FieldByName('ImageGuid').AsString;
                LOrigName := LQuery.FieldByName('OriginalFileName').AsString;
                LUploadDate := LQuery.FieldByName('UploadDate').AsDateTime;
                LFileSizeKB := LQuery.FieldByName('FileSizeKB').AsInteger;
                LContentType := LQuery.FieldByName('ContentType').AsString;
                LWidth := LQuery.FieldByName('Width').AsInteger;
                LHeight := LQuery.FieldByName('Height').AsInteger;

                LObj := TJSONObject.Create;
                LObj.AddPair('ImagePhoneID', TJSONNumber.Create(LImagePhoneID));
                LObj.AddPair('ImageGuid', TJSONString.Create(LImageGuid));
                LObj.AddPair('OriginalFileName', TJSONString.Create(LOrigName));
                LObj.AddPair('SavedFileName', TJSONString.Create(MakeSavedFileName(LImageGuid, LOrigName)));
                LObj.AddPair('UploadDate', TJSONString.Create(DateTimeToStr(LUploadDate)));
                LObj.AddPair('FileSizeKB', TJSONNumber.Create(LFileSizeKB));
                LObj.AddPair('ContentType', TJSONString.Create(LContentType));
                LObj.AddPair('Width', TJSONNumber.Create(LWidth));
                LObj.AddPair('Height', TJSONNumber.Create(LHeight));

                LArr.Add(LObj);
                LQuery.Next;
            End;

            // assemble final JSON
            Result := TJSONObject.Create;
            Result.AddPair('data', LArr);
            // meta object
            Result.AddPair('meta', TJSONObject.Create);
            (Result.GetValue('meta') As TJSONObject).AddPair('page', TJSONNumber.Create(Page));
            (Result.GetValue('meta') As TJSONObject).AddPair('pageSize', TJSONNumber.Create(PageSize));
            (Result.GetValue('meta') As TJSONObject).AddPair('total', TJSONNumber.Create(LTotal));

            // NOTE: LArr now owned by Result (do not free separately)
        Except
            LArr.Free;
            Raise;
        End;

    Finally
        FreeAndNil(LQuery);
        FreeAndNil(LCountQuery);
    End;
End;


End.

