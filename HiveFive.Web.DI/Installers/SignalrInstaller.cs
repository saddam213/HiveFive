using Castle.MicroKernel.Registration;
using Castle.MicroKernel.SubSystems.Configuration;
using Castle.Windsor;
using Microsoft.AspNet.SignalR.Hubs;

namespace HiveFive.Web.DI.Installers
{
	public class SignalrInstaller : IWindsorInstaller
	{
		public void Install(IWindsorContainer container, IConfigurationStore store)
		{
			container.Register(Classes.FromAssemblyNamed("HiveFive.Web")
				.BasedOn<IHub>()
				.LifestyleTransient()
			);
		}
	}
}
