namespace HiveFive.Core.Common.Throttle
{
	public class ThrottleResult
	{
		public ThrottleResult(bool throttleRequest, string message = null)
		{
			Message = message;
			ThrottleRequest = throttleRequest;
		}

		public bool ThrottleRequest { get; }
		public string Message { get; set; }
	}
}
