using System.Collections.Generic;

namespace HiveFive.Core.Common.Hive
{
	public class HiveMessage
	{
		public string Id { get; set; }
		public string Sender { get; set; }
		public string SenderName { get; set; }
		public bool IsSenderVerified { get; set; }

		public string Message { get; set; }
		public long Timestamp { get; set; }
		public HashSet<string> Hives { get; set; } = new HashSet<string>();
		public HashSet<string> MessageType { get; set; } = new HashSet<string>();
	}
}
