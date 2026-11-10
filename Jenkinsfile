pipeline {
    agent any
    stages {
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        export VERSION=v20.11.0
                        export DISTRO=linux-x64
                        curl -fsSL https://nodejs.org/dist/$VERSION/node-$VERSION-$DISTRO.tar.gz -o node.tar.gz
                        tar -xzf node.tar.gz
                        export PATH=$PWD/node-$VERSION-$DISTRO/bin:$PATH
                        
                        npm install
                        chmod +x node_modules/.bin/*
                        npm run build
                    '''
                }
            }
        }
       stage('Deploy to Server') {
            steps {
                sh '''
                    echo "Deploying files via SSH/SCP to production..."
                    
                    # Create local distribution package folder
                    mkdir -p frontend-dist
                    cp -r frontend/dist/* frontend-dist/
                    
                    # Ensure public_html exists and sync files over SSH to your user account
                    # (Replace 'itwekala-ttsmp' and your server IP/localhost if needed)
                    ssh -o StrictHostKeyChecking=no itwekala-ttsmp@localhost "mkdir -p /home/itwekala-ttsmp/htdocs/ttsmp.itwekala.com.lk/public_html"
                    scp -r frontend/dist/* itwekala-ttsmp@localhost:/home/itwekala-ttsmp/htdocs/ttsmp.itwekala.com.lk/public_html/
                    
                    echo "Deployment completed successfully!"
                '''
            }
        }
    }
}
