using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using HiveFive.Enums;

namespace HiveFive.Data.Entity
{
	public class User
	{
		[Key]
		public int Id { get; set; }

		[MaxLength(256)]
		public string UserName { get; set; }

		[MaxLength(256)]
		public string Email { get; set; }

		public bool EmailConfirmed { get; set; }

		public bool IsEnabled { get; set; }
		public DateTime Registered { get; set; }
		public string SecurityStamp { get; set; }

		public TwoFactorType TwoFactorType { get; set; }

		[MaxLength(128)]
		public string TwoFactorPrivateKey { get; set; }

		[MaxLength(128)]
		public string TwoFactorPublicKey { get; set; }
		public string TwoFactorRecoveryCode { get; set; }

		public DateTime? LockoutEndDateUtc { get; set; }
		public string Culture { get; set; }
		public string Avatar { get; set; }

		public virtual ICollection<UserLogon> Logons { get; set; }
	}
}