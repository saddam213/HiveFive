using System.Collections.Generic;

namespace HiveFive.Web.Hubs
{
	public class HiveMessage
	{
		public string Id { get; set; }
		public string Sender { get; set; }
		public string Receiver { get; set; }
		public string Message { get; set; }
		public long Timestamp { get; set; }
		public HashSet<string> Hives { get; set; } = new HashSet<string>();
		public HashSet<string> MessageType { get; set; } = new HashSet<string>();
	}
}