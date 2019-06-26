using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HiveFive.Enums;

namespace HiveFive.Data.Entity
{
	public class UserLogon
	{
		public UserLogon()
		{
			Timestamp = DateTime.UtcNow;
		}

		[Key]
		public long Id { get; set; }
		public int UserId { get; set; }
		public string IPAddress { get; set; }
		public string UserAgent { get; set; }
		public string Device { get; set; }
		public string Location { get; set; }
		public LogonType Type { get; set; }
		public DateTime Timestamp { get; set; }

		public virtual User User { get; set; }
	}
}