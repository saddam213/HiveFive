using System.Web.Mvc;
using Castle.MicroKernel.Registration;
using Castle.MicroKernel.SubSystems.Configuration;
using Castle.Windsor;

namespace HiveFive.Web.DI.Installers
{
	public class ControllersInstaller : IWindsorInstaller
	{
		public void Install(IWindsorContainer container, IConfigurationStore store)
		{
			container.Register(Classes.FromAssemblyNamed("HiveFive.Web")
				.BasedOn<IController>()
				.LifestyleTransient()
			);
		}
	}
}
