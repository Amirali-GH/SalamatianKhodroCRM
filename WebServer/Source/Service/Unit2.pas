unit Unit2;

interface

uses
  Unit1,
  MVCFramework.Container, System.Generics.Collections;

type
  IPeopleService = interface
    ['{75E36DB9-8E73-499F-A437-E5ABC84766B5}']
    function GetAll: TObjectList<TPerson>;
  end;

  TPeopleService = class(TInterfacedObject, IPeopleService)
  protected
    function GetAll: TObjectList<TPerson>;
  end;

procedure RegisterServices(Container: IMVCServiceContainer);

implementation

uses
  System.SysUtils;

procedure RegisterServices(Container: IMVCServiceContainer);
begin
  Container.RegisterType(TPeopleService, IPeopleService, TRegistrationType.SingletonPerRequest);
  // Register other services here
end;

function TPeopleService.GetAll: TObjectList<TPerson>;
begin
  Result := TObjectList<TPerson>.Create;
  Result.AddRange([
    TPerson.Create(1, 'Henry', 'Ford', EncodeDate(1863, 7, 30)),
    TPerson.Create(2, 'Guglielmo', 'Marconi', EncodeDate(1874, 4, 25)),
    TPerson.Create(3, 'Antonio', 'Meucci', EncodeDate(1808, 4, 13)),
    TPerson.Create(4, 'Michael', 'Faraday', EncodeDate(1867, 9, 22))
  ]);
end;


end.
