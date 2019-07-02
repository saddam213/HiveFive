﻿using System.Collections.Generic;
using System.Threading.Tasks;

namespace HiveFive.Web.Hubs
{
	public interface IFollowerStore
	{
		Task FollowHandle(string userHandle, string userToFollow);
		Task UnfollowHandle(string userHandle, string userToUnfollow);
		Task<IEnumerable<string>> GetFollowers(string userHandle);
		Task<IEnumerable<string>> GetFollowing(string userHandle);
	}
}
