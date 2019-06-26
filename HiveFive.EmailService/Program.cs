using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading.Tasks;
using HiveFive.Framework.Logging;

namespace HiveFive.EmailService
{
	class Program
	{
		static void Main(string[] args)
		{
			var level = LoggingManager.LogLevelFromString(ConfigurationManager.AppSettings["LogLevel"]);
			var location = ConfigurationManager.AppSettings["LogLocation"];
#if DEBUG
			LoggingManager.AddLog(new ConsoleLogger(level));
			using (var processor = new EmailServiceBase())
			{
				processor.StartService();
				Console.WriteLine("Press Enter to terminate ...");
				Console.ReadLine();
				processor.StopService();
			}
#else

			LoggingManager.AddLog(new FileLogger(location, "EmailService", level));
			ServiceBase[] ServicesToRun;
			ServicesToRun = new ServiceBase[]
			{
				new EmailServiceBase()
			};
			ServiceBase.Run(ServicesToRun);
			LoggingManager.Destroy();
#endif
		}
	}
}
