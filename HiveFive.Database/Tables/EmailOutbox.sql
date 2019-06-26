CREATE TABLE [dbo].[EmailOutbox] (
    [Id]          INT              IDENTITY (1, 1) NOT NULL,
    [Type]        TINYINT          NOT NULL,
    [UserId]      INT              NOT NULL,
    [Destination] NVARCHAR (128)   NULL,
    [Parameters]  NVARCHAR (4000)  NULL,
    [Status]      TINYINT          CONSTRAINT [DF_EmailOutbox_Status] DEFAULT ((0)) NOT NULL,
    [Error]       NVARCHAR (4000)  NULL,
    [Updated]     DATETIME2 (7)    CONSTRAINT [DF_EmailOutbox_Updated] DEFAULT (getdate()) NOT NULL,
    [Created]     DATETIME2 (7)    CONSTRAINT [DF_EmailOutbox_Created] DEFAULT (getdate()) NOT NULL,
    [UserCulture] NVARCHAR (10)    NULL,
    CONSTRAINT [PK_EmailOutbox] PRIMARY KEY CLUSTERED ([Id] ASC)
);

