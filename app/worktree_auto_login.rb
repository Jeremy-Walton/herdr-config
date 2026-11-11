# frozen_string_literal: true

return unless Rails.env.development? && ENV['WT_AUTO_LOGIN_EMAIL'].present?

Rails.application.config.to_prepare do
  ApplicationController.prepend_before_action(unless: :devise_controller?) do
    next if user_identity_signed_in?

    identity = UserIdentity.find_by(email: ENV['WT_AUTO_LOGIN_EMAIL'])
    sign_in(identity) if identity
  end
end
