namespace HiveFive.Core.Common.Throttle
{
	public enum ThrottleAction
	{
		SendMessage = 0,
		JoinHive = 1,
		LeaveHive = 2,
		SubscribeHives = 3,
		SubscribeFollowers = 4,
		FollowUser = 5,
		UnfollowUser = 6,
		GetTrending = 7
	}
}
