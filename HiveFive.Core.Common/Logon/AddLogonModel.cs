using HiveFive.Enums;

namespace HiveFive.Core.Common.Logon
{
	public class AddLogonModel
	{
		public int UserId { get; set; }
		public string IPAddress { get; set; }
		public string UserAgent { get; set; }
		public string Location { get; set; }
		public string Device { get; set; }
		public LogonType Type { get; set; }
	}
}
