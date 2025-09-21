Unit Service.Interfaces;

Interface

Uses
    System.Classes,
    System.Generics.Collections,
    MVCFramework.Container,
    Model.User;


Procedure RegisterServices(Container: IMVCServiceContainer);

Implementation

Uses
    Service.User,
    Service.Upload;

//________________________________________________________________________________________
Procedure RegisterServices(Container: IMVCServiceContainer);
Begin

End;
//________________________________________________________________________________________

End.
