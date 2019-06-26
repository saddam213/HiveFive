CREATE TABLE [dbo].[UserClaims]
(
   [Id]         INT              IDENTITY (1, 1) NOT NULL,
    [UserId]     INT NOT NULL,
    [ClaimType]  NVARCHAR (256)   NULL,
    [ClaimValue] NVARCHAR (256)   NULL,
    CONSTRAINT [PK_dbo.AspNetUserClaims] PRIMARY KEY CLUSTERED ([Id] ASC) WITH (FILLFACTOR = 80),
    CONSTRAINT [FK_UserClaims_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id])
);
