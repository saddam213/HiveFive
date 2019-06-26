CREATE PROCEDURE[dbo].[Core_UserLogon_Insert]
	 @UserId INT
	,@IpAddress NVARCHAR(128)
	,@UserAgent NVARCHAR(256)
	,@Device NVARCHAR(128)
	,@Location NVARCHAR(128)
	,@Type TINYINT
AS

INSERT INTO [dbo].[UserLogon]
(
	 [UserId]
	,[IPAddress]
	,[UserAgent]
	,[Device]
	,[Location]
	,[Type]
	,[Timestamp]
)
VALUES
(
	 @UserId
	,@IpAddress
	,@UserAgent
	,@Device
	,@Location
	,@Type
	,SYSUTCDATETIME()
)

SELECT SCOPE_IDENTITY()