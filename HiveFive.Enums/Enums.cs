using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HiveFive.Enums
{
	public enum LogonType : byte
	{
		LoginSuccess = 0,
		LoginPasswordFailed = 1,
		LoginTwoFactorFailed = 2,
		LoginDeviceFailed = 3
	}

	public enum EmailTemplateType : byte
	{
		Contact = 0,
		Registration = 1,
		LogonSuccess = 2,
		LogonFail = 3,
		Lockout = 4,
		PasswordReset = 5,
		LockoutByUser = 6,

		TwoFactorLogin = 7,
		TwoFactorUnlock = 8,
		TwoFactorReset = 9,
		TwoFactorSetup = 10,
		TwoFactorRemove = 11
	}

	public enum TwoFactorType : byte
	{
		None = 0,
		EmailCode = 1,
		OtpCode = 2,
		PinCode = 3
	}

	public enum TwoFactorTokenType : byte
	{
		Withdraw = 0,
		UnlockAccount = 2,
		LockAccount = 3,
		EmailConfirm = 4
	}

	public enum EmailStatus : byte
	{
		Pending = 0,
		Failed = 1,
		Processed = 2
	}
}
