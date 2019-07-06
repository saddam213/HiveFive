--Insert Dev
SET IDENTITY_INSERT [dbo].[Users] ON 
INSERT [dbo].[Users] ([Id], [UserName], [Email], [EmailConfirmed], [PasswordHash], [SecurityStamp], [LockoutEndDateUtc], [LockoutEnabled], [AccessFailedCount], [IsEnabled], [Registered], [TwoFactorType], [TwoFactorPrivateKey], [TwoFactorPublicKey], [TwoFactorRecoveryCode], [Culture], [Avatar]) 
VALUES (1, N'sa_ddam213', N'sa_ddam213@live.com', 1, N'ANiZbf7paATjj7MF6UxBuFNc65OqsWC8BAS7RB+D9TJbsRk2bA34wU9FfhwWO1JpCQ==', N'd4a72430-c6f2-4861-98ac-714620ac0ceb', NULL, 1, 0, 1, GETUTCDATE(), 0, NULL, NULL, NULL, N'en-US', N'Avatar.png')
SET IDENTITY_INSERT [dbo].[Users] OFF

--User Roles
INSERT [dbo].[UserRoles] ([Id], [Name]) VALUES (1, N'Admin')
INSERT [dbo].[UserInRoles] ([UserId], [RoleId]) VALUES (1, 1)

-- Email templates
INSERT INTO [dbo].[EmailTemplate] ([Type], [Culture], [Parameters],[FromAddress],[Subject],[Template], [TemplateHtml], [IsEnabled])
Values
(
	1, --Registration
	'en-US',	
	'{0} = IPAddress, {1} = UserName, {2} = Activation Link',
	'noreply@hivefive.com',
	'Registration',
	'{0} = IPAddress, {1} = UserName, {2} = Activation Link',
	'{0} = IPAddress, {1} = UserName, {2} = Activation Link',
	1
),
(
	2, --LogonSuccess
	'en-US',
	'{0} = IPAddress, {1} = UserName',	
	'noreply@hivefive.com',
	'LogonSuccess',
	'{0} = IPAddress, {1} = UserName',
	'{0} = IPAddress, {1} = UserName',
	1
),
(
	3, --LogonFail
	'en-US',
	'{0} = IPAddress, {1} = UserName, {2} = Failed Attempts, {3} = Remaining Attempts',
	'noreply@hivefive.com',
	'LogonFail',
	'{0} = IPAddress, {1} = UserName, {2} = Failed Attempts, {3} = Remaining Attempts',
	'{0} = IPAddress, {1} = UserName, {2} = Failed Attempts, {3} = Remaining Attempts',
	1
),
(
	4, --Lockout
	'en-US',
	'{0} = IPAddress, {1} = UserName',
	'noreply@hivefive.com',
	'Lockout',
	'{0} = IPAddress, {1} = UserName',
	'{0} = IPAddress, {1} = UserName',
	1
),
(
	5, --PasswordReset
	'en-US',
	'{0} = IPAddress, {1} = UserName, {2} = Reset Code',					
	'noreply@hivefive.com',
	'PasswordReset',
	'{0} = IPAddress, {1} = UserName, {2} = Reset Code',
	'{0} = IPAddress, {1} = UserName, {2} = Reset Code',
	1
),
(
	6, --LockoutByUser
	'en-US',
	'{0} = IPAddress, {1} = UserName',
	'noreply@hivefive.com',
	'LockoutByUser',
	'{0} = IPAddress, {1} = UserName',
	'{0} = IPAddress, {1} = UserName',
	1
),
(
	7, --TwoFactorLogin
	'en-US',
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',
	'noreply@hivefive.com',
	'TwoFactorLogin',
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',
	1
),
(
	8, --TwoFactorUnlock
	'en-US',
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',
	'noreply@hivefive.com',
	'TwoFactorUnlock',
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',
	1
),
(
	9, --TwoFactorReset
	'en-US',
	'{0} = UserName, {1} = RecoveryCode',
	'noreply@hivefive.com',
	'TwoFactorReset',
	'{0} = UserName, {1} = RecoveryCode',
	'{0} = UserName, {1} = RecoveryCode',
	1
),
(
	10, --TwoFactorSetup
	'en-US',	
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',	
	'noreply@hivefive.com',	
	'TwoFactorSetup',	
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',	
	1
),
(
	11, --TwoFactorRemove
	'en-US',
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',
	'noreply@hivefive.com',
	'TwoFactorRemove',
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',
	'{0} = IPAddress, {1} = UserName, {2} = Two Factor Code',
	1
)