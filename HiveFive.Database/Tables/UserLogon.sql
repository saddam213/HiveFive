CREATE TABLE [dbo].[UserLogon] (
    [Id]        BIGINT           IDENTITY (1, 1) NOT NULL,
    [UserId]    INT              NOT NULL,
    [IPAddress] NVARCHAR (128)   NOT NULL,
    [UserAgent] NVARCHAR (256)   NULL,
    [Device]    NVARCHAR (128)   NULL,
    [Location]  NVARCHAR (128)   NULL,
    [Type]   TINYINT              NOT NULL,
    [Timestamp] DATETIME         NOT NULL,
    CONSTRAINT [PK_dbo.UserLogon] PRIMARY KEY CLUSTERED ([Id] ASC) WITH (FILLFACTOR = 80),
    CONSTRAINT [FK_UserLogon_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id])
);

