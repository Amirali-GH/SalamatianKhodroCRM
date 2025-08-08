Unit Controller.Goftino;

Interface

Uses
    MVCFramework, MVCFramework.Commons, MVCFramework.Nullables,
    Model.Goftino, Service.Goftino, MVCFramework.Serializer.Commons, System.Generics.Collections;

Type
  [MVCPath('/api')]
  TMyController = class(TMVCController)
  protected
    procedure OnBeforeAction(Context: TWebContext; const AActionName: string; var Handled: Boolean); override;
    procedure OnAfterAction(Context: TWebContext; const AActionName: string); override;
  public
    [MVCPath]
    [MVCHTTPMethod([httpGET])]
    [MVCProduces(TMVCMediaType.TEXT_HTML)]
    function Index: String;

    [MVCPath('/reversedstrings/($Value)')]
    [MVCHTTPMethod([httpGET])]
    [MVCProduces(TMVCMediaType.TEXT_PLAIN)]
    function GetReversedString(const Value: String): String;

    //Sample CRUD Actions for a "People" entity
    [MVCPath('/people')]
    [MVCHTTPMethod([httpGET])]
    function GetPeople([MVCInject] PeopleService: IPeopleService): IMVCResponse;

    [MVCPath('/people/($ID:sqids)')]
    [MVCHTTPMethod([httpGET])]
    function GetPerson(ID: Integer): TPerson;

    [MVCPath('/people')]
    [MVCHTTPMethod([httpPOST])]
    function CreatePerson([MVCFromBody] Person: TPerson): IMVCResponse;

    [MVCPath('/people/($ID:sqids)')]
    [MVCHTTPMethod([httpPUT])]
    function UpdatePerson(ID: Integer; [MVCFromBody] Person: TPerson): IMVCResponse;

    [MVCPath('/people/($ID:sqids)')]
    [MVCHTTPMethod([httpDELETE])]
    function DeletePerson(ID: Integer): IMVCResponse;
  end;

implementation

uses
  System.StrUtils, System.SysUtils, MVCFramework.Logger;


procedure TMyController.OnAfterAction(Context: TWebContext; const AActionName: string);
begin
  { Executed after each action }
  inherited;
end;

procedure TMyController.OnBeforeAction(Context: TWebContext; const AActionName: string; var Handled: Boolean);
begin
  { Executed before each action
    if handled is true (or an exception is raised) the actual
    action will not be called }
  inherited;
end;

function TMyController.Index: String;
begin
{$IF CompilerVersion >= 34} //SYDNEY+
  var lProf := Profiler.Start(Context.ActionQualifiedName);
{$ENDIF}

  //use Context property to access to the HTTP request and response
  Result := '<p>Hello <strong>DelphiMVCFramework</strong> World</p>' + 
            '<p><small>dmvcframework-' + DMVCFRAMEWORK_VERSION + '</small></p>';
end;

function TMyController.GetReversedString(const Value: String): String;
begin
{$IF CompilerVersion >= 34} //SYDNEY+
  var lProf := Profiler.Start(Context.ActionQualifiedName);
{$ENDIF}

  Result := System.StrUtils.ReverseString(Value.Trim);
end;

//Sample CRUD Actions for a "People" entity (with service injection)
function TMyController.GetPeople(PeopleService: IPeopleService): IMVCResponse;
begin
{$IF CompilerVersion >= 34} //SYDNEY+
  var lProf := Profiler.Start(Context.ActionQualifiedName);
{$ENDIF}

  Result := OkResponse(PeopleService.GetAll);
end;

function TMyController.GetPerson(ID: Integer): TPerson;
begin
{$IF CompilerVersion >= 34} //SYDNEY+
  var lProf := Profiler.Start(Context.ActionQualifiedName);
{$ENDIF}

  Result := TPerson.Create(ID, 'Daniele', 'Teti', EncodeDate(1979, 11, 4));
end;

function TMyController.CreatePerson([MVCFromBody] Person: TPerson): IMVCResponse;
begin
{$IF CompilerVersion >= 34} //SYDNEY+
  var lProf := Profiler.Start(Context.ActionQualifiedName);
{$ENDIF}

  LogI('Created ' + Person.FirstName + ' ' + Person.LastName);
  Result := CreatedResponse('', 'Person created');
end;

function TMyController.UpdatePerson(ID: Integer; [MVCFromBody] Person: TPerson): IMVCResponse;
begin
{$IF CompilerVersion >= 34} //SYDNEY+
  var lProf := Profiler.Start(Context.ActionQualifiedName);
{$ENDIF}

  LogI('Updated ' + Person.FirstName + ' ' + Person.LastName);
  Result := NoContentResponse();
end;

function TMyController.DeletePerson(ID: Integer): IMVCResponse;
begin
{$IF CompilerVersion >= 34} //SYDNEY+
  var lProf := Profiler.Start(Context.ActionQualifiedName);
{$ENDIF}

  LogI('Deleted person with id ' + ID.ToString);
  Result := NoContentResponse();
end;

end.
