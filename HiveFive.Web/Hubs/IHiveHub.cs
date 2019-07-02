using System.Threading.Tasks;

namespace HiveFive.Web.Hubs
{
	public interface IHiveHub
	{
		Task OnMessage(HiveMessage value);
		Task OnFollowUpdate(FollowMessage followMessage);
		Task OnError(ErrorMessage errorMessage);
		Task OnHiveUpdate(HiveUpdateMessage hiveUpdateMessage);
	}
}