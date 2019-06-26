using System.Threading.Tasks;
using HiveFive.Enums;

namespace HiveFive.Core.Common.Email
{
	public interface IEmailService
	{
		Task<bool> SendEmail(EmailTemplateType type, int userId, string destination, params object[] emailParameters);
	}
}
