using Castle.MicroKernel.Registration;
using Castle.MicroKernel.SubSystems.Configuration;
using Castle.Windsor;

namespace HiveFive.Web.DI.Installers
{
	public class CoreInstaller : IWindsorInstaller
	{
		public void Install(IWindsorContainer container, IConfigurationStore store)
		{
			container.Register(Classes.FromAssemblyContaining<Core.Core>()
				.Pick()
				.WithService
				.DefaultInterfaces()
				.LifestyleTransient()
			);

			container.Register(Classes.FromAssemblyContaining<Data.Data>()
				.Pick()
				.WithService
				.DefaultInterfaces()
				.LifestyleTransient()
			);

			container.Register(Classes.FromAssemblyContaining<Data.Redis.Redis>()
				.Pick()
				.WithService
				.DefaultInterfaces()
				.LifestyleTransient()
			);
		}
	}
}
