CREATE TABLE [dbo].[EmailTemplate] (
    [Id]           INT             IDENTITY (1, 1) NOT NULL,
    [Type]         TINYINT         NOT NULL,
    [Culture]      NVARCHAR (10)   NOT NULL,
    [Parameters]   NVARCHAR (1024) NOT NULL,
    [FromAddress]  NVARCHAR (128)  NOT NULL,
    [Subject]      NVARCHAR (256)  NOT NULL,
    [Template]     NVARCHAR (MAX)  NOT NULL,
    [TemplateHtml] NVARCHAR (MAX)  NOT NULL,
    [IsEnabled]    BIT             NOT NULL,
    CONSTRAINT [PK_dbo.EmailTemplate] PRIMARY KEY CLUSTERED ([Id] ASC) WITH (FILLFACTOR = 80)
);

