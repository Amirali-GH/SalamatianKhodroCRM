Unit Utils;

Interface

Function TrimNonDigits(AValue: string): string;

Implementation

uses
    System.Character, System.SysUtils;

Function TrimNonDigits(AValue: string): string;
Var
    LIndex: Integer;
Begin
    Result := '';
    For LIndex := 1 to AValue.Length do
    Begin
        If AValue.Chars[LIndex-1].IsDigit then
        Begin
            Result := Result + AValue.Chars[LIndex-1];
        End;
    End;
End;

End.
