CREATE TABLE [dbo].[UserInRoles] (
    [UserId] INT NOT NULL,
    [RoleId] int NOT NULL,
    CONSTRAINT [PK_dbo.AspNetUserRoles] PRIMARY KEY CLUSTERED ([UserId] ASC, [RoleId] ASC) WITH (FILLFACTOR = 80)
);

