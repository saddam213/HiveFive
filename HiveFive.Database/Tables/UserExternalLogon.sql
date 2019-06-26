CREATE TABLE [dbo].[UserExternalLogon]
(   
[UserId]        INT NOT NULL,
    [LoginProvider] NVARCHAR (128)   NOT NULL,
    [ProviderKey]   NVARCHAR (128)   NOT NULL,
    CONSTRAINT [PK_dbo.AspNetUserLogins] PRIMARY KEY CLUSTERED ([LoginProvider] ASC, [ProviderKey] ASC, [UserId] ASC) WITH (FILLFACTOR = 80)
);
