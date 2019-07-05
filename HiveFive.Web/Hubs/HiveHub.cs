using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HiveFive.Core.Common.Follow;
using HiveFive.Core.Common.Hive;
using HiveFive.Core.Common.Throttle;
using HiveFive.Framework.Extensions;
using HiveFive.Web.Extensions;
using Microsoft.AspNet.SignalR;

namespace HiveFive.Web.Hubs
{
	public class HiveHub : Hub<IHiveHub>
	{
		public IThrottleStore ThrottleStore { get; set; }
		public IFollowerStore FollowerStore { get; set; }
		public IHiveConnectionStore ConnectionStore { get; set; }

		public override async Task OnConnected()
		{
			var handle = GetUserHandle();
			await ConnectionStore.LinkHandle(handle, Context.ConnectionId);
			await base.OnConnected();
		}

		public override async Task OnReconnected()
		{
			var handle = GetUserHandle();
			await ConnectionStore.LinkHandle(handle, Context.ConnectionId);
			await base.OnReconnected();
		}

		public override async Task OnDisconnected(bool stopCalled)
		{
			var handle = await ConnectionStore.GetHandle(Context.ConnectionId);
			var hivesToUnsubscribe = await ConnectionStore.UnlinkHandle(handle, Context.ConnectionId);
			await UnsubscribeAll(handle, hivesToUnsubscribe);
			await base.OnDisconnected(stopCalled);
		}

		public async Task<bool> SendMessage(string sender, string messageInput, string hiveTargets)
		{
			var senderId = GetUserHandle();
			var senderName = GetSenderName(sender, senderId);
			var throttleResult = await ThrottleStore.CheckThrottle(ThrottleAction.SendMessage, senderId, IsAuthenticated);
			if (throttleResult.ThrottleRequest)
				return await SendErrorMessage("Rate Limit", throttleResult.Message);

			var message = HiveValidation.ValidateMessage(messageInput);
			var timestamp = DateTime.UtcNow.ToJavaTime();
			var hives = HiveValidation.GetHives(message, hiveTargets);
			var messageId = HiveValidation.GetMessageId(senderId, message, timestamp);

			var hivers = await ConnectionStore.GetHiveUsers(hives);
			var mentions = HiveValidation.GetMentions(message);
			var followers = await GetFollowers(senderId);
			var messages = new Dictionary<string, HiveMessage>();

			// Messages to users in hives
			if (!hivers.IsNullOrEmpty())
			{
				foreach (var userHandle in hivers)
				{
					if (messages.ContainsKey(userHandle))
						continue;

					messages.Add(userHandle, new HiveMessage
					{
						Id = messageId,
						Sender = senderId,
						SenderName = senderName,
						IsSenderVerified = IsAuthenticated,
						Message = message,
						Timestamp = timestamp,
						Hives = new HashSet<string>(hives),
						MessageType = new HashSet<string> { "Feed" }
					});
				}
			}

			// Messages to users mentioned in message
			if (!mentions.IsNullOrEmpty())
			{
				foreach (var userHandle in mentions)
				{
					if (messages.ContainsKey(userHandle))
					{
						messages[userHandle].MessageType.Add("Mention");
						continue;
					}

					messages.Add(userHandle, new HiveMessage
					{
						Id = messageId,
						Sender = senderId,
						SenderName = senderName,
						IsSenderVerified = IsAuthenticated,
						Message = message,
						Timestamp = timestamp,
						Hives = new HashSet<string>(hives),
						MessageType = new HashSet<string> { "Mention" }
					});
				}
			}

			// Messages to anyone following the sender
			if (!followers.IsNullOrEmpty())
			{
				foreach (var userHandle in followers)
				{
					if (messages.ContainsKey(userHandle))
					{
						messages[userHandle].MessageType.Add("Follow");
						continue;
					}

					messages.Add(userHandle, new HiveMessage
					{
						Id = messageId,
						Sender = senderId,
						SenderName = senderName,
						IsSenderVerified = IsAuthenticated,
						Message = message,
						Timestamp = timestamp,
						Hives = new HashSet<string>(hives),
						MessageType = new HashSet<string> { "Follow" }
					});
				}
			}

			foreach (var item in messages)
			{
				await Clients.User(item.Key).OnMessage(item.Value);
			}
			return true;
		}

		public async Task<object> SubscribeFollowers(List<string> followers)
		{
			var handle = GetUserHandle();
			var throttleResult = await ThrottleStore.CheckThrottle(ThrottleAction.SubscribeFollowers, handle, IsAuthenticated);
			if (throttleResult.ThrottleRequest)
				return await SendErrorMessage("Rate Limit", throttleResult.Message);

			var following = await FollowerStore.GetFollowers(handle);

			if (followers.IsNullOrEmpty())
				return new
				{
					Followers = following,
					Following = new List<string>()
				};

			var result = new List<string>();
			foreach (var follower in followers.Select(x => x.Trim()).Distinct())
			{
				if (!HiveValidation.ValidateUserHandle(follower))
					continue;

				await FollowerStore.FollowHandle(handle, follower);
				await SendFollowUpdate(follower, handle, false);
				result.Add(follower);
			}

			return new
			{
				Followers = following,
				Following = result
			};
		}

		public async Task<bool> FollowUser(string userToFollow)
		{
			if (!HiveValidation.ValidateUserHandle(userToFollow))
				return await SendErrorMessage("Validation Error", "Invalid name format");

			var handle = GetUserHandle();
			var throttleResult = await ThrottleStore.CheckThrottle(ThrottleAction.FollowUser, handle, IsAuthenticated);
			if (throttleResult.ThrottleRequest)
				return await SendErrorMessage("Rate Limit", throttleResult.Message);

			await FollowerStore.FollowHandle(handle, userToFollow);
			await SendFollowUpdate(userToFollow, handle, false);
			return true;
		}

		public async Task<bool> UnfollowUser(string userToUnfollow)
		{
			if (!HiveValidation.ValidateUserHandle(userToUnfollow))
				return await SendErrorMessage("Validation Error", "Invalid name format");

			var handle = GetUserHandle();
			var throttleResult = await ThrottleStore.CheckThrottle(ThrottleAction.UnfollowUser, handle, IsAuthenticated);
			if (throttleResult.ThrottleRequest)
				return await SendErrorMessage("Rate Limit", throttleResult.Message);

			await FollowerStore.UnfollowHandle(handle, userToUnfollow);
			await SendFollowUpdate(userToUnfollow, handle, true);
			return true;
		}

		public async Task<List<string>> SubscribeHives(List<string> hives)
		{
			var results = new List<string>();
			if (hives.IsNullOrEmpty())
				return results;

			var handle = GetUserHandle();
			var throttleResult = await ThrottleStore.CheckThrottle(ThrottleAction.SubscribeHives, handle, IsAuthenticated);
			if (throttleResult.ThrottleRequest)
			{
				await SendErrorMessage("Rate Limit", throttleResult.Message);
				return results;
			}

			foreach (var hive in hives)
			{
				var hiveName = HiveValidation.GetHiveName(hive, true);
				if (string.IsNullOrEmpty(hiveName))
					continue;

				await Subscribe(handle, hiveName);
				results.Add(hiveName);
			}
			return results;
		}

		public async Task<bool> JoinHive(string hive)
		{
			var hiveName = HiveValidation.GetHiveName(hive, true);
			if (string.IsNullOrEmpty(hiveName))
				return await SendErrorMessage("Validation Error", "Invalid Hive name");

			var handle = GetUserHandle();
			var throttleResult = await ThrottleStore.CheckThrottle(ThrottleAction.JoinHive, handle, IsAuthenticated);
			if (throttleResult.ThrottleRequest)
				return await SendErrorMessage("Rate Limit", throttleResult.Message);

			await Subscribe(handle, hiveName);
			return true;
		}

		public async Task<bool> LeaveHive(string hive)
		{
			var hiveName = HiveValidation.GetHiveName(hive, true);
			if (string.IsNullOrEmpty(hiveName))
				return await SendErrorMessage("Validation Error", "Invalid Hive name");

			var handle = GetUserHandle();
			var throttleResult = await ThrottleStore.CheckThrottle(ThrottleAction.LeaveHive, handle, IsAuthenticated);
			if (throttleResult.ThrottleRequest)
				return await SendErrorMessage("Rate Limit", throttleResult.Message);

			await Unsubscribe(handle, hiveName);
			return true;
		}

		public async Task<IEnumerable<object>> GetTrending()
		{
			var handle = GetUserHandle();
			var throttleResult = await ThrottleStore.CheckThrottle(ThrottleAction.JoinHive, handle, IsAuthenticated);
			if (throttleResult.ThrottleRequest)
			{
				await SendErrorMessage("Rate Limit", throttleResult.Message);
				return Enumerable.Empty<object>();
			}
			return await ConnectionStore.GetPopularHives(15);
		}

		private async Task<bool> SendErrorMessage(string header, string error)
		{
			await Clients.Caller.OnError(new ErrorMessage
			{
				Header = header,
				Message = error
			});
			return false;
		}

		private Task SendFollowUpdate(string userTarget, string handle, bool isRemove)
		{
			return Clients.User(userTarget)
				.OnFollowUpdate(new FollowMessage
				{
					Action = isRemove ? "Remove" : "Add",
					UserHandle = handle
				});
		}

		private async Task Subscribe(string userHandle, string hive)
		{
			await ConnectionStore.LinkHive(userHandle, hive);
			await SendHiveUpdate(hive);
		}

		private async Task Unsubscribe(string userHandle, string hive)
		{
			await ConnectionStore.UnlinkHive(userHandle, hive);
			await SendHiveUpdate(hive);
		}

		private async Task UnsubscribeAll(string userHandle, IEnumerable<string> hives)
		{
			foreach (var hive in hives)
			{
				await SendHiveUpdate(hive);
			}
		}

		private async Task SendHiveUpdate(string hive)
		{
			await Clients.All.OnHiveUpdate(new HiveUpdateMessage
			{
				Hive = hive,
				Count = await ConnectionStore.GetCount(hive),
				Total = await ConnectionStore.GetCount()
			});
		}

		private Task<IEnumerable<string>> GetFollowers(string userHandle)
		{
			return FollowerStore.GetFollowers(userHandle);
		}

		private bool IsAuthenticated
		{
			get { return Context.User.Identity.IsAuthenticated; }
		}

		private string GetUserHandle()
		{
			return IsAuthenticated
				? Context.Request.GetHttpContext().User.Identity.Name
				: Context.Request.GetHttpContext().Request.GetIPAddressUser();
		}

		private string GetSenderName(string sender, string senderId)
		{
			if (IsAuthenticated)
				return null;

			if (string.IsNullOrEmpty(sender) || sender.Equals(senderId))
				return null;

			var handle = sender.Trim().Truncate(15);
			if (!HiveValidation.ValidateUserHandle(handle))
				return null;

			return handle;
		}
	}
}