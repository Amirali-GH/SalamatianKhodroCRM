unit Model.Goftino;

interface

uses
  MVCFramework.Nullables, MVCFramework.Serializer.Commons;

type
  TPerson = class
  private
    fID: NullableInt32;
    fFirstName: String;
    fLastName: String;
    fDOB: TDate;
  public
    [MVCSerializeAsSqids]
    property ID: NullableInt32 read fID write fID;
    property FirstName: String read fFirstName write fFirstName;
    property LastName: String read fLastName write fLastName;
    property DOB: TDate read fDOB write fDOB;  
    constructor Create(ID: Integer; FirstName, LastName: String; DOB: TDate);
  end;

implementation

constructor TPerson.Create(ID: Integer; FirstName, LastName: String; DOB: TDate);
begin
  inherited Create;
  fID := ID;
  fFirstName := FirstName;
  fLastName := LastName;
  fDOB := DOB;
end;


end.
