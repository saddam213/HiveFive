CREATE TABLE [dbo].[Users] (
    [Id]                                  INT IDENTITY (1, 1) NOT NULL,
    [UserName]                            NVARCHAR (128)   NOT NULL,
    [Email]                               NVARCHAR (256)   NULL,
    [EmailConfirmed]                      BIT              NOT NULL,
    [PasswordHash]                        NVARCHAR (128)   NULL,
    [SecurityStamp]                       NVARCHAR (128)   NULL,
    [LockoutEndDateUtc]                   DATETIME         NULL,
    [LockoutEnabled]                      BIT              NOT NULL,
    [AccessFailedCount]                   INT              NOT NULL,
    [IsEnabled]                           BIT              DEFAULT ((1)) NOT NULL,
    [Registered]                          DATETIME         NULL,
    [TwoFactorType]                       TINYINT          DEFAULT ((0)) NOT NULL,
    [TwoFactorPrivateKey]                 NVARCHAR (128)   NULL,
    [TwoFactorPublicKey]                  NVARCHAR (128)   NULL,
    [TwoFactorRecoveryCode]               NVARCHAR (20)    NULL,
    [Culture]                             NVARCHAR (10)    NULL,
    [Avatar]                              NVARCHAR (128)   DEFAULT(('Avatar.png')) NULL
    CONSTRAINT [PK_dbo.Users] PRIMARY KEY CLUSTERED ([Id] ASC) WITH (FILLFACTOR = 80)
);



