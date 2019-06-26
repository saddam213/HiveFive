CREATE TABLE [dbo].[UserRoles] (
    [Id]   int NOT NULL,
    [Name] NVARCHAR (128)   NOT NULL,
    CONSTRAINT [PK_dbo.AspNetRoles] PRIMARY KEY CLUSTERED ([Id] ASC) WITH (FILLFACTOR = 80)
);

