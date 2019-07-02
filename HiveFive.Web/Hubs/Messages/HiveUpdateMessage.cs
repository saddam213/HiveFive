namespace HiveFive.Web.Hubs
{
	public class HiveUpdateMessage
	{
		public string Hive { get; set; }
		public int Count { get; set; }
		public int Total { get; set; }
	}
}