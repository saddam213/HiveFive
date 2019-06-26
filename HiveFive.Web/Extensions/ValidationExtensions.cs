using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace HiveFive.Web.Extensions
{
	public static class ValidationExtensions
	{
		public static bool IsValidEmailAddress(string emailAddress)
		{
			return new System.ComponentModel.DataAnnotations
								.EmailAddressAttribute()
								.IsValid(emailAddress);
		}
	}
}