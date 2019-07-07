using System.Threading.Tasks;
using HiveFive.Core.Common.Hive;

namespace HiveFive.Web.Hubs
{
	public interface IHiveHub
	{
		Task OnMessage(HiveMessage value);
		Task OnFollowUpdate(FollowMessage followMessage);
		Task OnError(ErrorMessage errorMessage);
		Task OnHiveUpdate(HiveUpdateMessage hiveUpdateMessage);

		Task OnSyncRequest(OnSyncRequestMessage request);
		Task OnSyncResponse(OnSyncResponseMessage response);
	}
}